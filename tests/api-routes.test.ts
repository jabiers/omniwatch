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
    ai: { model: 'claude-sonnet-4-6', api_key: '', ollama_url: 'http://localhost:11434' },
    notification: {
      slack_webhook: '',
      discord_webhook: '',
      webhook_url: '',
      telegram_token: '',
      telegram_chat_id: '',
      system: true,
      channels: {},
    },
    agent: { max_count: 20, memory_limit_mb: 128, max_heal_attempts: 3 },
  }),
  saveConfig: vi.fn(),
}));

vi.mock('@omniwatch/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@omniwatch/shared')>();
  return {
    ...actual,
    log: vi.fn(),
    initLogger: vi.fn(),
  };
});

// Mock node:fs used by system routes
vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue(''),
  statSync: vi.fn().mockReturnValue({ size: 1024 }),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  rmSync: vi.fn(),
}));

// Mock daemon engine handlers
const mockAgentCreate = vi.fn().mockRejectedValue(new Error('Daemon is not running'));
const mockAgentDestroy = vi.fn().mockRejectedValue(new Error('Daemon is not running'));
const mockAgentStart = vi.fn().mockRejectedValue(new Error('Daemon is not running'));
const mockAgentStop = vi.fn().mockRejectedValue(new Error('Daemon is not running'));
const mockAgentRestart = vi.fn().mockRejectedValue(new Error('Daemon is not running'));

vi.mock('@omniwatch/daemon/engine', () => ({
  handleAgentRPC: {
    create: (...args: unknown[]) => mockAgentCreate(...args),
    list: vi.fn(),
    get: vi.fn(),
    start: (...args: unknown[]) => mockAgentStart(...args),
    stop: (...args: unknown[]) => mockAgentStop(...args),
    restart: (...args: unknown[]) => mockAgentRestart(...args),
    destroy: (...args: unknown[]) => mockAgentDestroy(...args),
  },
  handleChatRPC: {
    chat: vi.fn().mockRejectedValue(new Error('Daemon is not running')),
    preview: vi.fn().mockRejectedValue(new Error('Daemon is not running')),
    apply: vi.fn().mockRejectedValue(new Error('Daemon is not running')),
  },
  handleSnapshotRPC: {
    capture: vi.fn().mockRejectedValue(new Error('Daemon is not running')),
    restore: vi.fn().mockRejectedValue(new Error('Daemon is not running')),
    list: vi.fn(),
  },
  handleQueueRPC: {
    stats: vi.fn().mockReturnValue({ pending: 0, processing: 0, completed: 0 }),
    deadLetters: vi.fn().mockReturnValue({ letters: [] }),
    retryDeadLetter: vi.fn().mockReturnValue({ success: true }),
    cleanup: vi.fn(),
    resetStale: vi.fn(),
  },
  handleAnalyticsRPC: {
    metrics: vi.fn().mockReturnValue({ metrics: [] }),
    anomalies: vi.fn().mockReturnValue({ anomalies: [] }),
    alertRules: vi.fn().mockReturnValue({ rules: [] }),
    createAlert: vi.fn(),
    updateAlert: vi.fn(),
    deleteAlert: vi.fn(),
    checkAlerts: vi.fn(),
  },
  handleMeshRPC: {
    topology: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
  },
  handleSecurityRPC: {
    events: vi.fn().mockReturnValue({ events: [] }),
  },
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

  it('should return 502 when engine throws', async () => {
    mockAgentCreate.mockRejectedValueOnce(new Error('Daemon is not running'));

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
    const createdAgent = { id: 'agent-new', name: 'cpu-mon', status: 'creating' };
    mockAgentCreate.mockResolvedValueOnce(createdAgent);

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
    expect(typeof body.daemonPid).toBe('number');
    expect(body.daemonRunning).toBe(true);
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
  it('should return 400 when agentId is missing', async () => {
    const res = await app.request('/api/analytics/metrics');
    expect(res.status).toBe(400);
  });

  it('should return metrics from engine', async () => {
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
    mockAgentCreate.mockResolvedValueOnce({ id: 'agent-1' });

    const res = await app.request('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test prompt', type: 'doer' }),
    });
    // Should not fail validation — either 201 (success) or 502 (engine error)
    expect([201, 502]).toContain(res.status);
  });
});

// ─── Chat Routes Validation (v2.4) ─────────────────────────────────

describe('POST /api/agents/:id/chat', () => {
  it('should reject when message is missing', async () => {
    const res = await app.request('/api/agents/agent-1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('should reject empty message', async () => {
    const res = await app.request('/api/agents/agent-1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('should accept valid chat message', async () => {
    const res = await app.request('/api/agents/agent-1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Increase check interval to 5 minutes' }),
    });
    // 502 = engine mock rejects, but validation passed
    expect(res.status).toBe(502);
  });
});

describe('POST /api/agents/preview', () => {
  it('should reject when prompt is missing', async () => {
    const res = await app.request('/api/agents/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('should accept valid preview request', async () => {
    const res = await app.request('/api/agents/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Monitor CPU usage' }),
    });
    expect(res.status).toBe(502);
  });
});

describe('POST /api/agents/:id/apply', () => {
  it('should reject when code is missing', async () => {
    const res = await app.request('/api/agents/agent-1/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('should accept valid code', async () => {
    const res = await app.request('/api/agents/agent-1/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'export default (sdk) => { sdk.log.info("hello"); };' }),
    });
    expect(res.status).toBe(502);
  });
});

// ─── Config Route Validation (v2.4) ────────────────────────────────

describe('PUT /api/config', () => {
  it('should reject when config key is missing', async () => {
    const res = await app.request('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('should accept valid config update', async () => {
    const res = await app.request('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { ai: { model: 'claude-sonnet-4-6' } } }),
    });
    expect(res.status).toBe(200);
  });

  it('should accept agent settings update', async () => {
    const res = await app.request('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { agent: { max_count: 50 } } }),
    });
    expect(res.status).toBe(200);
  });
});
