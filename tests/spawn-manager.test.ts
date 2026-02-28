import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @omniwatch/shared
vi.mock('@omniwatch/shared', () => ({
  log: vi.fn(),
  MAX_SPAWN_DEPTH: 3,
  SPAWN_RATE_LIMIT: 5,
  MAX_AGENTS: 20,
}));

// Mock @omniwatch/db
const mockAgentRows: Record<string, unknown> = {};
vi.mock('@omniwatch/db', () => ({
  getDb: () => ({
    prepare: (sql: string) => ({
      run: vi.fn(),
      get: () => {
        if (sql.includes('COUNT(*)')) return { count: 2 };
        return null;
      },
      all: (parentId: string) => {
        return Object.values(mockAgentRows).filter((a: any) => a.parent_id === parentId);
      },
    }),
  }),
}));

// Mock agent-manager
vi.mock('../apps/daemon/src/agent-manager.js', () => ({
  getAgent: (id: string) => {
    if (id === 'parent-1') return { id: 'parent-1', spawn_depth: 0, status: 'running' };
    if (id === 'deep-parent') return { id: 'deep-parent', spawn_depth: 3, status: 'running' };
    return null;
  },
  createAgentRecord: vi.fn().mockReturnValue({ id: 'child-1' }),
  startAgent: vi.fn(),
}));

// Mock code-generator
vi.mock('../apps/daemon/src/code-generator.js', () => ({
  generateAgentCode: vi.fn().mockResolvedValue({
    name: 'child-agent',
    description: 'A child agent',
    code: 'export default async (sdk) => { sdk.log.info("hello"); }',
    dependencies: [],
  }),
}));

// Mock code-validator
vi.mock('../apps/daemon/src/code-validator.js', () => ({
  validateCode: vi.fn().mockReturnValue({ valid: true, issues: [] }),
}));

// Mock dependency-installer
vi.mock('../apps/daemon/src/dependency-installer.js', () => ({
  installDependencies: vi.fn(),
}));

const { spawnChildAgent, getChildAgents, getSpawnChain } = await import('../apps/daemon/src/spawn-manager.js');

describe('Spawn Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('spawnChildAgent', () => {
    it('should throw if parent not found', async () => {
      await expect(
        spawnChildAgent('nonexistent', 'create an agent')
      ).rejects.toThrow('not found');
    });

    it('should throw if max spawn depth exceeded', async () => {
      await expect(
        spawnChildAgent('deep-parent', 'create an agent')
      ).rejects.toThrow('Max spawn depth');
    });

    it('should create and start child agent', async () => {
      const { createAgentRecord, startAgent } = await import('../apps/daemon/src/agent-manager.js');
      const childId = await spawnChildAgent('parent-1', 'monitor API health');

      expect(createAgentRecord).toHaveBeenCalled();
      expect(startAgent).toHaveBeenCalledWith('child-1');
      expect(childId).toBe('child-1');
    });
  });

  describe('getChildAgents', () => {
    it('should return children from DB', () => {
      const children = getChildAgents('parent-1');
      expect(Array.isArray(children)).toBe(true);
    });
  });

  describe('getSpawnChain', () => {
    it('should return agent and children', () => {
      const chain = getSpawnChain('parent-1');
      expect(chain).toHaveProperty('agent');
      expect(chain).toHaveProperty('children');
    });
  });
});
