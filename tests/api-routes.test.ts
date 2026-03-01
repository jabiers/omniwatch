import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock state ---
const mockGet = vi.fn();
const mockRun = vi.fn();
const mockAll = vi.fn().mockReturnValue([]);

vi.mock('@omniwatch/db', () => ({
  getDb: () => ({
    prepare: (_sql: string) => ({
      run: mockRun,
      get: mockGet,
      all: mockAll,
    }),
  }),
  loadConfig: () => ({
    ai: { ollama_url: 'http://localhost:11434' },
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

// Mock node:fs used by system routes and rpc-bridge
vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue(''),
  statSync: vi.fn().mockReturnValue({ size: 1024 }),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  rmSync: vi.fn(),
}));

// Mock rpc-bridge to avoid socket connections
vi.mock('../apps/api/src/lib/rpc-bridge.js', () => ({
  rpcCall: vi.fn().mockRejectedValue(new Error('Daemon is not running')),
  isDaemonRunning: vi.fn().mockReturnValue(false),
  getDaemonPid: vi.fn().mockReturnValue(null),
}));

// Mock nanoid used by oauth routes
vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockReturnValue('mock-nanoid-12'),
}));

// Enable dev auth bypass for tests
process.env.OMNIWATCH_DEV_AUTH = '1';

import { createApp } from '../apps/api/src/app.js';

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  vi.clearAllMocks();
  mockAll.mockReturnValue([]);
  app = createApp();
});

// ─── Health Check ─────────────────────────────────────────────────────

describe('GET /health', () => {
  it('should return 200 with status ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });
});

// ─── Agents Routes ───────────────────────────────────────────────────

describe('GET /api/agents', () => {
  it('should return 200 with agents array', async () => {
    const agents = [
      { id: 'agent-1', name: 'watcher-1', status: 'running' },
      { id: 'agent-2', name: 'doer-1', status: 'stopped' },
    ];
    mockAll.mockReturnValueOnce(agents);

    const res = await app.request('/api/agents');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.agents).toEqual(agents);
  });

  it('should return empty array when no agents exist', async () => {
    mockAll.mockReturnValueOnce([]);

    const res = await app.request('/api/agents');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.agents).toEqual([]);
  });

  it('should accept status filter query parameter', async () => {
    const running = [{ id: 'agent-1', status: 'running' }];
    mockAll.mockReturnValueOnce(running);

    const res = await app.request('/api/agents?status=running');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.agents).toEqual(running);
  });

  it('should reject invalid status filter', async () => {
    const res = await app.request('/api/agents?status=invalid');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/agents/:id', () => {
  it('should return 200 with agent when found', async () => {
    const agent = { id: 'agent-1', name: 'test', status: 'running', tenant_id: 'default' };
    mockGet.mockReturnValueOnce(agent);

    const res = await app.request('/api/agents/agent-1');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.agent).toEqual(agent);
  });

  it('should return 404 when agent not found', async () => {
    mockGet.mockReturnValueOnce(undefined);

    const res = await app.request('/api/agents/nonexistent');
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toContain('not found');
  });
});

describe('POST /api/agents', () => {
  it('should return 400 when prompt is missing', async () => {
    const res = await app.request('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test-agent' }),
    });
    expect(res.status).toBe(400);
  });

  it('should return 400 when prompt is empty', async () => {
    const res = await app.request('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('should return 502 when daemon is not running', async () => {
    // rpcCall is mocked to reject with "Daemon is not running"
    const { rpcCall } = await import('../apps/api/src/lib/rpc-bridge.js');
    vi.mocked(rpcCall).mockRejectedValueOnce(new Error('Daemon is not running'));

    const res = await app.request('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Monitor CPU usage', type: 'watcher' }),
    });
    expect(res.status).toBe(502);

    const body = await res.json();
    expect(body.error).toBe('Daemon is not running');
  });

  it('should return 201 when agent is created successfully', async () => {
    const { rpcCall } = await import('../apps/api/src/lib/rpc-bridge.js');
    const createdAgent = { id: 'agent-new', name: 'cpu-mon', status: 'creating' };
    vi.mocked(rpcCall).mockResolvedValueOnce(createdAgent);

    const res = await app.request('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Monitor CPU usage', type: 'watcher' }),
    });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.agent).toEqual(createdAgent);
  });
});

// ─── System Status ───────────────────────────────────────────────────

describe('GET /api/system/status', () => {
  it('should return 200 with system status', async () => {
    // system/status is a public path (no auth needed)
    // It calls db.prepare().get() twice for agent counts
    mockGet.mockReturnValueOnce({ count: 5 }); // total agents
    mockGet.mockReturnValueOnce({ count: 2 }); // running agents

    const res = await app.request('/api/system/status');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.agentCount).toBe(5);
    expect(body.runningCount).toBe(2);
    expect(body.daemonPid).toBe(null);
    expect(body.daemonRunning).toBe(false);
    expect(typeof body.dbSize).toBe('number');
    expect(typeof body.uptime).toBe('number');
  });
});

// ─── Marketplace ─────────────────────────────────────────────────────

describe('GET /api/marketplace', () => {
  it('should return 200 with recipes array', async () => {
    const recipes = [
      {
        id: 'recipe-1',
        name: 'CPU Monitor',
        description: 'Monitors CPU usage',
        prompt: 'Watch CPU',
        category: 'monitoring',
        author: 'admin',
        version: '1.0.0',
        downloads: 10,
        rating: 4.5,
        tags: '["cpu","monitor"]',
        config: '{}',
        published: 1,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ];
    mockAll.mockReturnValueOnce(recipes);

    const res = await app.request('/api/marketplace');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.recipes)).toBe(true);
    expect(body.recipes.length).toBe(1);
    // Tags should be parsed from JSON string to array
    expect(body.recipes[0].tags).toEqual(['cpu', 'monitor']);
    expect(body.recipes[0].config).toEqual({});
  });

  it('should return empty array when no recipes', async () => {
    mockAll.mockReturnValueOnce([]);

    const res = await app.request('/api/marketplace');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.recipes).toEqual([]);
  });

  it('should accept category filter', async () => {
    mockAll.mockReturnValueOnce([]);

    const res = await app.request('/api/marketplace?category=monitoring');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.recipes).toEqual([]);
  });

  it('should accept search parameter', async () => {
    mockAll.mockReturnValueOnce([]);

    const res = await app.request('/api/marketplace?search=cpu');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.recipes).toEqual([]);
  });

  it('should accept sort parameter', async () => {
    mockAll.mockReturnValueOnce([]);

    const res = await app.request('/api/marketplace?sort=newest');
    expect(res.status).toBe(200);
    expect((await res.json()).recipes).toEqual([]);
  });
});

// ─── Analytics ───────────────────────────────────────────────────────

describe('GET /api/analytics/metrics', () => {
  it('should return 503 when daemon is not running', async () => {
    // isDaemonRunning returns false (default mock)
    const res = await app.request('/api/analytics/metrics?agentId=agent-1');
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.error).toBe('Daemon not running');
  });

  it('should return 400 when agentId is missing', async () => {
    const res = await app.request('/api/analytics/metrics');
    expect(res.status).toBe(400);
  });

  it('should return metrics when daemon is running', async () => {
    const { isDaemonRunning, rpcCall } = await import('../apps/api/src/lib/rpc-bridge.js');
    vi.mocked(isDaemonRunning).mockReturnValueOnce(true);
    vi.mocked(rpcCall).mockResolvedValueOnce({ metrics: [] });

    const res = await app.request('/api/analytics/metrics?agentId=agent-1');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.metrics).toEqual([]);
  });
});

// ─── Notifications ───────────────────────────────────────────────────

describe('GET /api/notifications', () => {
  it('should return 200 with notifications array', async () => {
    const notifications = [{ id: 1, agent_id: 'agent-1', severity: 'info', message: 'started' }];
    mockAll.mockReturnValueOnce(notifications);

    const res = await app.request('/api/notifications');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.notifications).toEqual(notifications);
  });

  it('should return empty array when no notifications', async () => {
    mockAll.mockReturnValueOnce([]);

    const res = await app.request('/api/notifications');
    expect(res.status).toBe(200);
    expect((await res.json()).notifications).toEqual([]);
  });
});

// ─── Agent Logs ──────────────────────────────────────────────────────

describe('GET /api/agents/:id/logs', () => {
  it('should return 404 when agent not found', async () => {
    mockGet.mockReturnValueOnce(undefined);

    const res = await app.request('/api/agents/nonexistent/logs');
    expect(res.status).toBe(404);
  });

  it('should return logs for existing agent', async () => {
    // First get: agent exists check
    mockGet.mockReturnValueOnce({ id: 'agent-1' });
    // Then all: fetch logs
    const logs = [
      { id: 1, agent_id: 'agent-1', level: 'info', message: 'started', created_at: '2026-01-01' },
    ];
    mockAll.mockReturnValueOnce(logs);

    const res = await app.request('/api/agents/agent-1/logs');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.logs).toEqual(logs);
  });
});

// ─── Agent Metrics ───────────────────────────────────────────────────

describe('GET /api/agents/:id/metrics', () => {
  it('should return 404 when agent not found', async () => {
    mockGet.mockReturnValueOnce(undefined);

    const res = await app.request('/api/agents/nonexistent/metrics');
    expect(res.status).toBe(404);
  });

  it('should return default metrics when no metrics recorded', async () => {
    // First get: agent exists
    mockGet.mockReturnValueOnce({ id: 'agent-1' });
    // Second get: metrics (none)
    mockGet.mockReturnValueOnce(undefined);

    const res = await app.request('/api/agents/agent-1/metrics');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.metrics.agent_id).toBe('agent-1');
    expect(body.metrics.run_count).toBe(0);
    expect(body.metrics.error_count).toBe(0);
  });

  it('should return actual metrics when available', async () => {
    const metrics = {
      agent_id: 'agent-1',
      run_count: 42,
      success_count: 40,
      error_count: 2,
      avg_duration_ms: 150,
      last_duration_ms: 120,
    };
    mockGet.mockReturnValueOnce({ id: 'agent-1' });
    mockGet.mockReturnValueOnce(metrics);

    const res = await app.request('/api/agents/agent-1/metrics');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.metrics).toEqual(metrics);
  });
});

// ─── POST /api/agents validation ─────────────────────────────────────

describe('POST /api/agents validation', () => {
  it('should reject prompt exceeding max length', async () => {
    const res = await app.request('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'x'.repeat(5001) }),
    });
    expect(res.status).toBe(400);
  });

  it('should reject invalid agent type', async () => {
    const res = await app.request('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test', type: 'invalid' }),
    });
    expect(res.status).toBe(400);
  });

  it('should accept valid agent types', async () => {
    const { rpcCall } = await import('../apps/api/src/lib/rpc-bridge.js');
    vi.mocked(rpcCall).mockResolvedValueOnce({ id: 'agent-1' });

    const res = await app.request('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test prompt', type: 'doer' }),
    });
    // Should not fail validation — either 201 (success) or 502 (daemon not running)
    expect([201, 502]).toContain(res.status);
  });
});
