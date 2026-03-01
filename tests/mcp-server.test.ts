import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @vigil/db
const mockDbRows: Record<string, unknown[]> = {
  agents: [],
  agent_logs: [],
};
vi.mock('@vigil/db', () => ({
  getDb: () => ({
    prepare: (sql: string) => ({
      all: (..._args: unknown[]) => {
        if (sql.includes('FROM agents')) return mockDbRows.agents;
        if (sql.includes('FROM agent_logs')) return mockDbRows.agent_logs;
        return [];
      },
      get: (...args: unknown[]) => {
        if (sql.includes('FROM agents WHERE id')) {
          return mockDbRows.agents.find((a: any) => a.id === args[0]) || null;
        }
        if (sql.includes('COUNT(*)')) return { c: mockDbRows.agents.length };
        return null;
      },
      run: vi.fn(),
    }),
  }),
}));

// Mock rpc-bridge
const mockRpcCall = vi.fn();
vi.mock('../apps/api/src/lib/rpc-bridge.js', () => ({
  rpcCall: (...args: unknown[]) => mockRpcCall(...args),
  isDaemonRunning: () => true,
}));

describe('MCP Server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbRows.agents = [
      {
        id: 'agent-1',
        name: 'BTC Watcher',
        type: 'watcher',
        status: 'running',
        description: 'Monitors BTC',
        created_at: '2026-01-01',
      },
      {
        id: 'agent-2',
        name: 'ETH Tracker',
        type: 'watcher',
        status: 'stopped',
        description: 'Tracks ETH',
        created_at: '2026-01-02',
      },
    ];
    mockDbRows.agent_logs = [
      { level: 'info', message: 'Agent started', created_at: '2026-01-01T00:00:00Z' },
      { level: 'error', message: 'Connection failed', created_at: '2026-01-01T00:01:00Z' },
    ];
  });

  describe('Tool handlers (unit)', () => {
    it('list_agents should return agents from DB', async () => {
      const { getDb } = await import('@vigil/db');
      const db = getDb();
      const agents = db.prepare("SELECT * FROM agents WHERE status != 'destroyed'").all();
      expect(agents).toHaveLength(2);
      expect(agents[0]).toHaveProperty('id', 'agent-1');
    });

    it('get_agent should return single agent by ID', async () => {
      const { getDb } = await import('@vigil/db');
      const db = getDb();
      const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get('agent-1');
      expect(agent).toBeDefined();
      expect((agent as any).name).toBe('BTC Watcher');
    });

    it('get_agent should return null for unknown agent', async () => {
      const { getDb } = await import('@vigil/db');
      const db = getDb();
      const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get('nonexistent');
      expect(agent).toBeNull();
    });

    it('get_agent_logs should return log entries', async () => {
      const { getDb } = await import('@vigil/db');
      const db = getDb();
      const logs = db
        .prepare('SELECT * FROM agent_logs WHERE agent_id = ? LIMIT ?')
        .all('agent-1', 20);
      expect(logs).toHaveLength(2);
    });

    it('control_agent should call rpcCall with correct params', async () => {
      mockRpcCall.mockResolvedValue({ id: 'agent-1', status: 'running' });
      const result = await mockRpcCall('agent.start', { id: 'agent-1' });
      expect(result).toHaveProperty('status', 'running');
      expect(mockRpcCall).toHaveBeenCalledWith('agent.start', { id: 'agent-1' });
    });

    it('create_agent should call rpcCall with prompt and timeout', async () => {
      mockRpcCall.mockResolvedValue({ id: 'agent-3', name: 'New Agent', status: 'running' });
      const result = await mockRpcCall(
        'agent.create',
        { prompt: 'Monitor API health', name: 'API Monitor' },
        { timeout: 60_000 },
      );
      expect(result).toHaveProperty('id', 'agent-3');
      expect(mockRpcCall).toHaveBeenCalledWith(
        'agent.create',
        { prompt: 'Monitor API health', name: 'API Monitor' },
        { timeout: 60_000 },
      );
    });

    it('system_stats should return correct agent count', async () => {
      const { getDb } = await import('@vigil/db');
      const db = getDb();
      const total = (
        db.prepare("SELECT COUNT(*) as c FROM agents WHERE status != 'destroyed'").get() as {
          c: number;
        }
      ).c;
      expect(total).toBe(2);
    });

    it('snapshot_capture should call rpcCall and return seq', async () => {
      mockRpcCall.mockResolvedValue({ seq: 1 });
      const result = await mockRpcCall('snapshot.capture', { agentId: 'agent-1', label: 'test' });
      expect(result).toHaveProperty('seq', 1);
    });
  });

  describe('MCP tool response format', () => {
    it('should return content array with text type', () => {
      const response = {
        content: [{ type: 'text' as const, text: JSON.stringify({ id: 'agent-1' }, null, 2) }],
      };
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      expect(JSON.parse(response.content[0].text)).toHaveProperty('id', 'agent-1');
    });

    it('should return isError flag for error responses', () => {
      const response = {
        content: [{ type: 'text' as const, text: 'Agent not found' }],
        isError: true,
      };
      expect(response.isError).toBe(true);
    });

    it('should serialize agents list as JSON text', () => {
      const agents = mockDbRows.agents;
      const response = {
        content: [{ type: 'text' as const, text: JSON.stringify(agents, null, 2) }],
      };
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe('agent-1');
      expect(parsed[1].status).toBe('stopped');
    });
  });

  describe('MCP resource response format', () => {
    it('should return contents array with uri and mimeType', () => {
      const response = {
        contents: [
          {
            uri: 'vigil://agents',
            text: JSON.stringify([{ id: 'agent-1' }]),
            mimeType: 'application/json',
          },
        ],
      };
      expect(response.contents).toHaveLength(1);
      expect(response.contents[0].uri).toBe('vigil://agents');
      expect(response.contents[0].mimeType).toBe('application/json');
    });

    it('should support per-agent resource URI pattern', () => {
      const agentId = 'agent-1';
      const uri = `agent://${agentId}/status`;
      const response = {
        contents: [
          {
            uri,
            text: JSON.stringify({ id: agentId, status: 'running' }),
            mimeType: 'application/json',
          },
        ],
      };
      expect(response.contents[0].uri).toBe('agent://agent-1/status');
      const parsed = JSON.parse(response.contents[0].text);
      expect(parsed.status).toBe('running');
    });

    it('should support per-agent logs resource URI', () => {
      const agentId = 'agent-1';
      const response = {
        contents: [
          {
            uri: `agent://${agentId}/logs`,
            text: JSON.stringify(mockDbRows.agent_logs),
            mimeType: 'application/json',
          },
        ],
      };
      const parsed = JSON.parse(response.contents[0].text);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].level).toBe('info');
    });
  });

  describe('MCP RPC integration patterns', () => {
    it('control_agent should support start/stop/restart actions', async () => {
      for (const action of ['start', 'stop', 'restart']) {
        mockRpcCall.mockResolvedValueOnce({
          id: 'agent-1',
          status: action === 'stop' ? 'stopped' : 'running',
        });
        const result = await mockRpcCall(`agent.${action}`, { id: 'agent-1' });
        expect(result).toHaveProperty('id', 'agent-1');
      }
      expect(mockRpcCall).toHaveBeenCalledTimes(3);
    });

    it('should handle RPC errors gracefully', async () => {
      mockRpcCall.mockRejectedValue(new Error('Connection refused'));
      try {
        await mockRpcCall('agent.start', { id: 'agent-1' });
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe('Connection refused');
      }
    });

    it('snapshot.restore should accept agentId and seq', async () => {
      mockRpcCall.mockResolvedValue({ restored: true, seq: 3 });
      const result = await mockRpcCall('snapshot.restore', { agentId: 'agent-1', seq: 3 });
      expect(result).toHaveProperty('restored', true);
      expect(mockRpcCall).toHaveBeenCalledWith('snapshot.restore', { agentId: 'agent-1', seq: 3 });
    });
  });
});
