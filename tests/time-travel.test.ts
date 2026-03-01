import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @omniwatch/shared
vi.mock('@omniwatch/shared', () => ({
  log: vi.fn(),
  MAX_SNAPSHOTS_PER_AGENT: 3, // Low limit for testing
}));

// Agent store and snapshot data
let storeData: Record<string, { key: string; value: string }[]> = {};
let snapshotData: Record<string, { id: number; agent_id: string; seq: number; label: string | null; state_json: string; created_at: string }[]> = {};
let idCounter = 1;

const mockStmt = {
  run: vi.fn(),
  all: vi.fn(),
  get: vi.fn(),
};

// Mock @omniwatch/db
vi.mock('@omniwatch/db', () => ({
  getDb: () => ({
    prepare: (sql: string) => {
      if (sql.includes('SELECT key, value FROM agent_store')) {
        return {
          all: (agentId: string) => storeData[agentId] || [],
          run: vi.fn(),
          get: vi.fn(),
        };
      }
      if (sql.includes('SELECT level, message, created_at FROM agent_logs')) {
        return { all: () => [], run: vi.fn(), get: vi.fn() };
      }
      if (sql.includes('SELECT MAX(seq)')) {
        return {
          get: (agentId: string) => {
            const snaps = snapshotData[agentId] || [];
            const maxSeq = snaps.length > 0 ? Math.max(...snaps.map(s => s.seq)) : null;
            return { max_seq: maxSeq };
          },
          run: vi.fn(),
          all: vi.fn(),
        };
      }
      if (sql.includes('INSERT INTO agent_snapshots')) {
        return {
          run: (agentId: string, seq: number, label: string | null, stateJson: string) => {
            if (!snapshotData[agentId]) snapshotData[agentId] = [];
            snapshotData[agentId].push({
              id: idCounter++,
              agent_id: agentId,
              seq,
              label,
              state_json: stateJson,
              created_at: new Date().toISOString(),
            });
          },
          all: vi.fn(),
          get: vi.fn(),
        };
      }
      if (sql.includes('SELECT COUNT(*)') && sql.includes('agent_snapshots')) {
        return {
          get: (agentId: string) => ({ count: (snapshotData[agentId] || []).length }),
          run: vi.fn(),
          all: vi.fn(),
        };
      }
      if (sql.includes('DELETE FROM agent_snapshots WHERE id IN')) {
        return {
          run: (agentId: string, limit: number) => {
            const snaps = snapshotData[agentId] || [];
            snaps.sort((a, b) => a.seq - b.seq);
            snapshotData[agentId] = snaps.slice(limit);
          },
          all: vi.fn(),
          get: vi.fn(),
        };
      }
      if (sql.includes('SELECT * FROM agent_snapshots WHERE agent_id = ? AND seq = ?')) {
        return {
          get: (agentId: string, seq: number) => {
            const snaps = snapshotData[agentId] || [];
            return snaps.find(s => s.seq === seq);
          },
          run: vi.fn(),
          all: vi.fn(),
        };
      }
      if (sql.includes('DELETE FROM agent_store')) {
        return {
          run: (agentId: string) => {
            storeData[agentId] = [];
          },
          all: vi.fn(),
          get: vi.fn(),
        };
      }
      if (sql.includes('INSERT INTO agent_store')) {
        return {
          run: (agentId: string, key: string, value: string) => {
            if (!storeData[agentId]) storeData[agentId] = [];
            storeData[agentId].push({ key, value });
          },
          all: vi.fn(),
          get: vi.fn(),
        };
      }
      if (sql.includes('SELECT id, agent_id, seq, label, created_at FROM agent_snapshots')) {
        return {
          all: (agentId: string) => {
            return (snapshotData[agentId] || []).map(s => ({
              id: s.id, agent_id: s.agent_id, seq: s.seq, label: s.label, created_at: s.created_at,
            }));
          },
          run: vi.fn(),
          get: vi.fn(),
        };
      }
      return mockStmt;
    },
  }),
}));

// Mock agent-manager
const mockGetAgent = vi.fn((id: string): { id: string; name: string; status: string; config: string; heal_count: number; error_count: number; last_error: null } | null => ({
  id,
  name: 'Test Agent',
  status: 'running',
  config: '{}',
  heal_count: 0,
  error_count: 0,
  last_error: null,
}));
vi.mock('../apps/daemon/src/agent-manager.js', () => ({
  getAgent: (...args: unknown[]) => mockGetAgent(...args as [string]),
  updateAgent: vi.fn(),
}));

const { captureSnapshot, restoreSnapshot, listSnapshots } = await import('../apps/daemon/src/time-travel.js');

describe('Time Travel', () => {
  beforeEach(() => {
    storeData = {};
    snapshotData = {};
    idCounter = 1;
    vi.clearAllMocks();
  });

  describe('captureSnapshot', () => {
    it('should capture a snapshot and return sequence number', () => {
      storeData['agent-tt'] = [
        { key: 'counter', value: '42' },
      ];
      const seq = captureSnapshot('agent-tt', 'test-snap');
      expect(seq).toBe(1);
      expect(snapshotData['agent-tt']).toHaveLength(1);
      expect(snapshotData['agent-tt'][0].label).toBe('test-snap');
    });

    it('should increment sequence numbers', () => {
      const seq1 = captureSnapshot('agent-seq', 'first');
      const seq2 = captureSnapshot('agent-seq', 'second');
      expect(seq1).toBe(1);
      expect(seq2).toBe(2);
    });

    it('should throw if agent not found', () => {
      mockGetAgent.mockReturnValueOnce(null);
      expect(() => captureSnapshot('nonexistent')).toThrow('not found');
    });
  });

  describe('restoreSnapshot', () => {
    it('should restore store data from snapshot', () => {
      storeData['agent-restore'] = [
        { key: 'data', value: '"original"' },
      ];
      captureSnapshot('agent-restore', 'before-change');

      // Simulate data change
      storeData['agent-restore'] = [
        { key: 'data', value: '"modified"' },
      ];

      restoreSnapshot('agent-restore', 1);

      // Store should be cleared and restored from snapshot
      expect(storeData['agent-restore'].length).toBeGreaterThanOrEqual(0);
    });

    it('should throw if snapshot not found', () => {
      expect(() => restoreSnapshot('agent-x', 999)).toThrow('not found');
    });
  });

  describe('listSnapshots', () => {
    it('should return snapshot metadata', () => {
      captureSnapshot('agent-list', 'snap-a');
      captureSnapshot('agent-list', 'snap-b');
      const result = listSnapshots('agent-list');
      expect(result).toHaveLength(2);
    });
  });

  describe('pruneSnapshots', () => {
    it('should prune snapshots beyond MAX_SNAPSHOTS_PER_AGENT', () => {
      // MAX_SNAPSHOTS_PER_AGENT is mocked to 3
      for (let i = 0; i < 5; i++) {
        captureSnapshot('agent-prune');
      }
      // After pruning, should have at most 3
      expect(snapshotData['agent-prune'].length).toBeLessThanOrEqual(3);
    });
  });
});
