import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @omniwatch/db
const mockRun = vi.fn();
const mockAll = vi.fn().mockReturnValue([]);
vi.mock('@omniwatch/db', () => ({
  getDb: () => ({
    prepare: () => ({
      run: mockRun,
      all: mockAll,
      get: vi.fn(),
    }),
  }),
}));

// Mock @omniwatch/shared logger
vi.mock('@omniwatch/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@omniwatch/shared')>();
  return {
    ...actual,
    log: vi.fn(),
    initLogger: vi.fn(),
  };
});

import {
  getSandboxPolicy,
  getSandboxMemoryLimit,
  getSandboxTimeout,
  createSandboxedFs,
  isUrlAllowed,
  isSafeRequire,
  SANDBOX_BLOCKED_APIS,
  logSecurityEvent,
  getSecurityEvents,
} from '../apps/daemon/src/sandbox.js';
import {
  SANDBOX_TIMEOUT_STRICT,
  SANDBOX_TIMEOUT_STANDARD,
  SANDBOX_TIMEOUT_PERMISSIVE,
  SANDBOX_MEMORY_STRICT,
  SANDBOX_MEMORY_STANDARD,
  SANDBOX_MEMORY_PERMISSIVE,
  AGENTS_DIR,
} from '@omniwatch/shared';
import { join } from 'node:path';

describe('Agent Sandbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSandboxPolicy', () => {
    it('should return strict policy', () => {
      const policy = getSandboxPolicy('strict');
      expect(policy.timeout).toBe(SANDBOX_TIMEOUT_STRICT);
      expect(policy.memoryLimit).toBe(SANDBOX_MEMORY_STRICT);
      expect(policy.allowedHosts).toEqual([]);
      expect(policy.fsAccess).toBe('none');
    });

    it('should return standard policy', () => {
      const policy = getSandboxPolicy('standard');
      expect(policy.timeout).toBe(SANDBOX_TIMEOUT_STANDARD);
      expect(policy.memoryLimit).toBe(SANDBOX_MEMORY_STANDARD);
      expect(policy.allowedHosts).toBeNull(); // all HTTPS
      expect(policy.fsAccess).toBe('agent_dir');
    });

    it('should return permissive policy', () => {
      const policy = getSandboxPolicy('permissive');
      expect(policy.timeout).toBe(SANDBOX_TIMEOUT_PERMISSIVE);
      expect(policy.memoryLimit).toBe(SANDBOX_MEMORY_PERMISSIVE);
      expect(policy.allowedHosts).toBeNull();
      expect(policy.fsAccess).toBe('agent_dir_and_tmp');
    });
  });

  describe('getSandboxMemoryLimit', () => {
    it('should return correct memory limits', () => {
      expect(getSandboxMemoryLimit('strict')).toBe(64);
      expect(getSandboxMemoryLimit('standard')).toBe(128);
      expect(getSandboxMemoryLimit('permissive')).toBe(256);
    });
  });

  describe('getSandboxTimeout', () => {
    it('should return correct timeouts', () => {
      expect(getSandboxTimeout('strict')).toBe(10_000);
      expect(getSandboxTimeout('standard')).toBe(30_000);
      expect(getSandboxTimeout('permissive')).toBe(60_000);
    });
  });

  describe('createSandboxedFs', () => {
    it('should block all fs access in strict mode', () => {
      const fs = createSandboxedFs('agent-1', 'strict');
      expect(() => fs.readFileSync('/etc/passwd')).toThrow('Sandbox: filesystem access denied');
      expect(mockRun).toHaveBeenCalled(); // security event logged
    });

    it('should allow agent dir access in standard mode', () => {
      const fs = createSandboxedFs('agent-1', 'standard');
      const agentPath = join(AGENTS_DIR, 'agent-1', 'data.json');
      // existsSync should return false (file doesn't exist) but not throw
      expect(fs.existsSync(agentPath)).toBe(false);
    });

    it('should block outside-dir access in standard mode', () => {
      const fs = createSandboxedFs('agent-1', 'standard');
      expect(() => fs.readFileSync('/etc/hosts')).toThrow('Sandbox: filesystem access denied');
    });

    it('should return false for existsSync on blocked path', () => {
      const fs = createSandboxedFs('agent-1', 'standard');
      expect(fs.existsSync('/root/.ssh/id_rsa')).toBe(false);
    });
  });

  describe('isUrlAllowed', () => {
    it('should block non-HTTPS in strict mode', () => {
      expect(isUrlAllowed('http://example.com', 'agent-1', 'strict')).toBe(false);
    });

    it('should block unlisted hosts in strict mode', () => {
      expect(isUrlAllowed('https://evil.com', 'agent-1', 'strict')).toBe(false);
    });

    it('should allow all HTTPS in standard mode', () => {
      expect(isUrlAllowed('https://api.example.com/data', 'agent-1', 'standard')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isUrlAllowed('not-a-url', 'agent-1', 'standard')).toBe(false);
    });
  });

  describe('isSafeRequire', () => {
    it('should block dangerous modules', () => {
      expect(isSafeRequire('child_process')).toBe(false);
      expect(isSafeRequire('vm')).toBe(false);
      expect(isSafeRequire('worker_threads')).toBe(false);
      expect(isSafeRequire('cluster')).toBe(false);
    });

    it('should allow safe modules', () => {
      expect(isSafeRequire('axios')).toBe(true);
      expect(isSafeRequire('dayjs')).toBe(true);
      expect(isSafeRequire('lodash')).toBe(true);
    });
  });

  describe('SANDBOX_BLOCKED_APIS', () => {
    it('should include all dangerous APIs', () => {
      expect(SANDBOX_BLOCKED_APIS).toContain('child_process');
      expect(SANDBOX_BLOCKED_APIS).toContain('vm');
      expect(SANDBOX_BLOCKED_APIS).toContain('worker_threads');
      expect(SANDBOX_BLOCKED_APIS).toContain('process.exit');
      expect(SANDBOX_BLOCKED_APIS).toContain('process.kill');
    });
  });

  describe('logSecurityEvent', () => {
    it('should insert a security event into DB', () => {
      logSecurityEvent('agent-1', 'fs_violation', 'Read blocked: /etc/passwd');
      expect(mockRun).toHaveBeenCalledWith('agent-1', 'fs_violation', 'Read blocked: /etc/passwd');
    });
  });

  describe('getSecurityEvents', () => {
    it('should query events for specific agent', () => {
      getSecurityEvents('agent-1', 10);
      expect(mockAll).toHaveBeenCalledWith('agent-1', 10);
    });

    it('should query all events when no agentId', () => {
      getSecurityEvents(undefined, 50);
      expect(mockAll).toHaveBeenCalledWith(50);
    });
  });
});
