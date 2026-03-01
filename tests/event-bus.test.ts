import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @vigil/shared
vi.mock('@vigil/shared', () => ({
  log: vi.fn(),
  MESH_RATE_LIMIT: 100,
  MESH_MAX_PAYLOAD_SIZE: 65_536,
}));

// Mock @vigil/db
const mockDb = {
  prepare: vi.fn().mockReturnValue({
    run: vi.fn(),
    all: vi.fn().mockReturnValue([]),
    get: vi.fn(),
  }),
};
vi.mock('@vigil/db', () => ({
  getDb: () => mockDb,
}));

// Mock agent-manager
const mockProcesses = new Map();
vi.mock('../apps/daemon/src/agent-manager.js', () => ({
  getRunningProcesses: () => mockProcesses,
}));

// Inline import after mocks
const eventBusModule = await import('../apps/daemon/src/event-bus.js');
const { meshPublish, meshSubscribe, meshUnsubscribe, meshRemoveAgent, getMeshTopology } =
  eventBusModule as unknown as {
    meshPublish: (id: string, topic: string, payload: unknown) => void;
    meshSubscribe: (id: string, topic: string) => void;
    meshUnsubscribe: (id: string, topic: string) => void;
    meshRemoveAgent: (id: string) => void;
    getMeshTopology: () => { nodes: string[]; subscriptions: { agentId: string; topic: string }[] };
  };

describe('Event Bus (Agent Mesh)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcesses.clear();
  });

  describe('meshSubscribe', () => {
    it('should add subscription and persist to DB', () => {
      meshSubscribe('agent-1', 'btc.price');
      const topology = getMeshTopology();
      expect(topology.nodes).toContain('agent-1');
      expect(topology.subscriptions).toContainEqual({ agentId: 'agent-1', topic: 'btc.price' });
    });

    it('should not duplicate subscriptions', () => {
      meshSubscribe('agent-dup', 'test.topic');
      meshSubscribe('agent-dup', 'test.topic');
      const topology = getMeshTopology();
      const matches = topology.subscriptions.filter(
        (s) => s.agentId === 'agent-dup' && s.topic === 'test.topic',
      );
      expect(matches.length).toBe(1);
    });
  });

  describe('meshUnsubscribe', () => {
    it('should remove subscription', () => {
      meshSubscribe('agent-unsub', 'remove.me');
      meshUnsubscribe('agent-unsub', 'remove.me');
      const topology = getMeshTopology();
      const matches = topology.subscriptions.filter(
        (s) => s.agentId === 'agent-unsub' && s.topic === 'remove.me',
      );
      expect(matches.length).toBe(0);
    });
  });

  describe('meshPublish', () => {
    it('should reject oversized payloads', async () => {
      const { log } = await import('@vigil/shared');
      const bigPayload = 'x'.repeat(70_000);
      meshPublish('agent-pub', 'big.topic', bigPayload);
      expect(log).toHaveBeenCalledWith('warn', expect.stringContaining('payload exceeds'));
    });

    it('should deliver events to matching subscribers', () => {
      const mockSend = vi.fn();
      const mockChild = { connected: true, send: mockSend };
      mockProcesses.set('agent-sub', mockChild);

      meshSubscribe('agent-sub', 'test.event');
      meshPublish('agent-pub', 'test.event', { value: 42 });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'mesh.event',
          topic: 'test.event',
          payload: { value: 42 },
          from: 'agent-pub',
        }),
      );
    });

    it('should not deliver events back to publisher', () => {
      const mockSend = vi.fn();
      const mockChild = { connected: true, send: mockSend };
      mockProcesses.set('agent-self', mockChild);

      meshSubscribe('agent-self', 'self.topic');
      meshPublish('agent-self', 'self.topic', 'hello');

      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('meshRemoveAgent', () => {
    it('should remove all subscriptions for agent', () => {
      meshSubscribe('agent-remove', 'topic.a');
      meshSubscribe('agent-remove', 'topic.b');
      meshRemoveAgent('agent-remove');
      const topology = getMeshTopology();
      const matches = topology.subscriptions.filter((s) => s.agentId === 'agent-remove');
      expect(matches.length).toBe(0);
    });
  });
});

describe('topicMatches (via meshPublish routing)', () => {
  it('should match exact topics', () => {
    const mockSend = vi.fn();
    mockProcesses.set('agent-exact', { connected: true, send: mockSend });
    meshSubscribe('agent-exact', 'exact.match');
    meshPublish('other-agent', 'exact.match', 'data');
    expect(mockSend).toHaveBeenCalled();
  });

  it('should match wildcard patterns', () => {
    const mockSend = vi.fn();
    mockProcesses.set('agent-wild', { connected: true, send: mockSend });
    meshSubscribe('agent-wild', 'btc.*');
    meshPublish('other-agent2', 'btc.price', 'data');
    expect(mockSend).toHaveBeenCalled();
  });
});
