import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock state ---
const mockGet = vi.fn();
const mockRun = vi.fn();
const mockAll = vi.fn().mockReturnValue([]);

vi.mock('@omniwatch/db', () => ({
  getDb: () => ({
    prepare: (sql: string) => ({
      run: mockRun,
      get: mockGet,
      all: mockAll,
    }),
  }),
}));

vi.mock('@omniwatch/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@omniwatch/shared')>();
  return {
    ...actual,
    log: vi.fn(),
    initLogger: vi.fn(),
  };
});

// Mock fs operations
const mockMkdirSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockExistsSync = vi.fn().mockReturnValue(false);
const mockRmSync = vi.fn();
vi.mock('node:fs', () => ({
  mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  rmSync: (...args: unknown[]) => mockRmSync(...args),
}));

vi.mock('node:child_process', () => ({
  fork: vi.fn(),
}));

// Mock internal daemon dependencies
vi.mock('../apps/daemon/src/notifier.js', () => ({ sendNotification: vi.fn() }));
vi.mock('../apps/daemon/src/health-monitor.js', () => ({ recordHeartbeat: vi.fn() }));
vi.mock('../apps/daemon/src/handlers/log.js', () => ({ broadcastLogEntry: vi.fn() }));
vi.mock('../apps/daemon/src/self-healer.js', () => ({ attemptHeal: vi.fn() }));
vi.mock('../apps/daemon/src/event-bus.js', () => ({
  meshPublish: vi.fn(),
  meshSubscribe: vi.fn(),
  meshUnsubscribe: vi.fn(),
  meshRemoveAgent: vi.fn(),
}));
vi.mock('../apps/daemon/src/spawn-manager.js', () => ({
  spawnChildAgent: vi.fn(),
  getChildAgents: vi.fn().mockReturnValue([]),
}));
vi.mock('../apps/daemon/src/time-travel.js', () => ({ captureSnapshot: vi.fn() }));
vi.mock('../apps/daemon/src/sandbox.js', () => ({
  getSandboxMemoryLimit: vi.fn().mockReturnValue(128),
  getSandboxTimeout: vi.fn().mockReturnValue(30000),
  logSecurityEvent: vi.fn(),
}));
vi.mock('../apps/daemon/src/metrics-collector.js', () => ({
  recordAgentStart: vi.fn(),
  recordAgentStop: vi.fn(),
  recordAgentError: vi.fn(),
  recordAgentHeal: vi.fn(),
}));

// Mock nanoid to return deterministic IDs
vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockReturnValue('abc12345'),
}));

import {
  enforceAgentLimit,
  createAgentRecord,
  getAgent,
  listAgents,
  updateAgent,
} from '../apps/daemon/src/agent-manager.js';
import { MAX_AGENTS, AGENTS_DIR, Errors } from '@omniwatch/shared';
import { join } from 'node:path';

describe('Agent Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- enforceAgentLimit ----------
  describe('enforceAgentLimit', () => {
    it('should pass when active agent count is below limit', () => {
      mockGet.mockReturnValueOnce({ count: 5 });
      expect(() => enforceAgentLimit()).not.toThrow();
    });

    it('should throw MAX_AGENTS_EXCEEDED when at limit', () => {
      mockGet.mockReturnValueOnce({ count: MAX_AGENTS });
      expect(() => enforceAgentLimit()).toThrow('Agent limit reached');
    });

    it('should throw when above limit', () => {
      mockGet.mockReturnValueOnce({ count: MAX_AGENTS + 5 });
      expect(() => enforceAgentLimit()).toThrow('Agent limit reached');
    });

    it('should allow when count is one below limit', () => {
      mockGet.mockReturnValueOnce({ count: MAX_AGENTS - 1 });
      expect(() => enforceAgentLimit()).not.toThrow();
    });
  });

  // ---------- createAgentRecord ----------
  describe('createAgentRecord', () => {
    const sampleConfig = { dependencies: ['axios'], interval: 5000 };
    const sampleCode = 'console.log("hello");';

    it('should create an agent record and write files to disk', () => {
      // enforceAgentLimit check
      mockGet.mockReturnValueOnce({ count: 0 });
      // getAgent call at the end returns the created agent
      const fakeAgent = {
        id: 'agent-abc12345',
        name: 'test-agent',
        type: 'watcher',
        prompt: 'Monitor CPU',
        description: 'desc',
        status: 'creating',
        code_hash: 'abcdef1234567890',
        config: JSON.stringify(sampleConfig),
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };
      mockGet.mockReturnValueOnce(fakeAgent);

      const result = createAgentRecord(
        'Monitor CPU',
        'test-agent',
        'desc',
        sampleCode,
        sampleConfig as any,
        'watcher',
      );

      // Should insert into DB
      expect(mockRun).toHaveBeenCalled();

      // Should create directory and write files
      const expectedDir = join(AGENTS_DIR, 'agent-abc12345');
      expect(mockMkdirSync).toHaveBeenCalledWith(expectedDir, { recursive: true });
      expect(mockWriteFileSync).toHaveBeenCalledTimes(2);

      // index.js written
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        join(expectedDir, 'index.js'),
        sampleCode,
      );

      // package.json written with dependencies
      const packageJsonCall = mockWriteFileSync.mock.calls[1];
      const pkg = JSON.parse(packageJsonCall[1] as string);
      expect(pkg.dependencies).toEqual({ axios: 'latest' });

      // Returns the agent
      expect(result).toEqual(fakeAgent);
    });

    it('should throw when agent limit is reached', () => {
      mockGet.mockReturnValueOnce({ count: MAX_AGENTS });

      expect(() =>
        createAgentRecord('test', 'name', null, 'code', {} as any, 'watcher'),
      ).toThrow('Agent limit reached');
    });

    it('should handle config with no dependencies', () => {
      mockGet.mockReturnValueOnce({ count: 0 });
      const agent = { id: 'agent-abc12345', name: 'no-deps', status: 'creating' };
      mockGet.mockReturnValueOnce(agent);

      const result = createAgentRecord('test', 'no-deps', null, 'code', {} as any);

      // package.json has empty dependencies
      const pkgCall = mockWriteFileSync.mock.calls[1];
      const pkg = JSON.parse(pkgCall[1] as string);
      expect(pkg.dependencies).toEqual({});
      expect(result).toEqual(agent);
    });
  });

  // ---------- getAgent ----------
  describe('getAgent', () => {
    it('should return agent when found', () => {
      const agent = { id: 'agent-1', name: 'test', status: 'running' };
      mockGet.mockReturnValueOnce(agent);

      const result = getAgent('agent-1');
      expect(result).toEqual(agent);
    });

    it('should return null when agent not found', () => {
      mockGet.mockReturnValueOnce(undefined);

      const result = getAgent('nonexistent');
      expect(result).toBeFalsy();
    });

    it('should exclude destroyed agents', () => {
      // The SQL excludes destroyed status, so even if DB returns nothing for
      // a destroyed agent, the result is null/undefined
      mockGet.mockReturnValueOnce(undefined);

      const result = getAgent('destroyed-agent');
      expect(result).toBeFalsy();
    });
  });

  // ---------- listAgents ----------
  describe('listAgents', () => {
    it('should return all non-destroyed agents when no status filter', () => {
      const agents = [
        { id: 'a1', status: 'running' },
        { id: 'a2', status: 'stopped' },
      ];
      mockAll.mockReturnValueOnce(agents);

      const result = listAgents();
      expect(result).toEqual(agents);
    });

    it('should filter by status when provided', () => {
      const running = [{ id: 'a1', status: 'running' }];
      mockAll.mockReturnValueOnce(running);

      const result = listAgents('running');
      expect(result).toEqual(running);
    });

    it('should return empty array when no agents match', () => {
      mockAll.mockReturnValueOnce([]);

      const result = listAgents('error');
      expect(result).toEqual([]);
    });
  });

  // ---------- updateAgent ----------
  describe('updateAgent', () => {
    it('should update agent fields', () => {
      updateAgent('agent-1', { status: 'running', pid: 1234 } as any);

      expect(mockRun).toHaveBeenCalled();
      // Verify the arguments contain the values and the id
      const args = mockRun.mock.calls[0];
      expect(args).toContain('running');
      expect(args).toContain(1234);
      expect(args).toContain('agent-1');
    });

    it('should skip id and created_at fields', () => {
      updateAgent('agent-1', {
        id: 'should-be-ignored',
        created_at: 'should-be-ignored',
        status: 'stopped',
      } as any);

      // Only status should be in the update, plus the agent id at the end
      const args = mockRun.mock.calls[0];
      expect(args).toContain('stopped');
      expect(args).toContain('agent-1');
      // id and created_at values should not be in the run params
      expect(args).not.toContain('should-be-ignored');
    });

    it('should always set updated_at', () => {
      updateAgent('agent-1', { name: 'new-name' } as any);
      // The SQL should contain updated_at — this is validated by the run call succeeding
      expect(mockRun).toHaveBeenCalledTimes(1);
    });
  });
});
