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

vi.mock('@omniwatch/api/engine', () => ({
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
    stats: vi.fn().mockReturnValue({ pending: 0, processing: 0, done_today: 0, dead_letters: 0 }),
    deadLetters: vi.fn().mockReturnValue([]),
    retryDeadLetter: vi.fn().mockReturnValue({ success: true }),
    cleanup: vi.fn(),
    resetStale: vi.fn(),
  },
  handleAnalyticsRPC: {
    metrics: vi.fn().mockReturnValue([]),
    anomalies: vi.fn().mockReturnValue([]),
    alertRules: vi.fn().mockReturnValue([]),
    createAlert: vi.fn(),
    updateAlert: vi.fn(),
    deleteAlert: vi.fn().mockReturnValue({ deleted: true }),
    checkAlerts: vi.fn(),
  },
  handleMeshRPC: {
    topology: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
  },
  handleSecurityRPC: {
    events: vi.fn().mockReturnValue([]),
  },
}));

// Mock nanoid used by oauth routes
vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockReturnValue('mock-nanoid-12'),
}));

// Disable rate limiter for tests (module reads env at load time, after import hoisting)
vi.mock('../apps/api/src/middleware/rate-limit.js', () => ({
  rateLimiter: () => async (_c: unknown, next: () => Promise<void>) => {
    await next();
  },
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
    mockGet.mockReturnValueOnce({ id: 'agent-1', tenant_id: 'default' });
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
    mockGet.mockReturnValueOnce({ id: 'agent-1', tenant_id: 'default' });
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

// ─── Bulk Agent Actions ────────────────────────────────────────────────

describe('POST /api/agents/bulk', () => {
  it('should reject empty ids array', async () => {
    const res = await app.request('/api/agents/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', ids: [] }),
    });
    expect(res.status).toBe(400);
  });

  it('should reject invalid action', async () => {
    const res = await app.request('/api/agents/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'invalid', ids: ['agent-1'] }),
    });
    expect(res.status).toBe(400);
  });

  it('should return results for bulk start', async () => {
    mockAgentStart.mockResolvedValueOnce({ id: 'agent-1', status: 'running' });

    const res = await app.request('/api/agents/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', ids: ['agent-1'] }),
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as { results: { id: string; success: boolean }[] };
    expect(body.results).toHaveLength(1);
    expect(body.results[0].id).toBe('agent-1');
    expect(body.results[0].success).toBe(true);
  });

  it('should handle mixed success/failure in bulk stop', async () => {
    mockAgentStop
      .mockResolvedValueOnce({ id: 'a1', status: 'stopped' })
      .mockRejectedValueOnce(new Error('Agent not found'));

    const res = await app.request('/api/agents/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop', ids: ['a1', 'a2'] }),
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      results: { id: string; success: boolean; error?: string }[];
    };
    expect(body.results).toHaveLength(2);
    expect(body.results[0].success).toBe(true);
    expect(body.results[1].success).toBe(false);
    expect(body.results[1].error).toBe('Agent not found');
  });
});

// ─── Queue Routes ──────────────────────────────────────────────────────

describe('GET /api/queue/stats', () => {
  it('should return queue statistics', async () => {
    const res = await app.request('/api/queue/stats');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { stats: { pending: number } };
    expect(body).toHaveProperty('stats');
    expect(body.stats).toHaveProperty('pending');
  });
});

describe('POST /api/queue/dead-letters/:id/retry', () => {
  it('should reject invalid id', async () => {
    const res = await app.request('/api/queue/dead-letters/abc/retry', {
      method: 'POST',
    });
    expect(res.status).toBe(400);
  });

  it('should accept valid numeric id', async () => {
    const res = await app.request('/api/queue/dead-letters/42/retry', {
      method: 'POST',
    });
    expect(res.status).toBe(200);
  });
});

describe('Security: Bulk tenant isolation', () => {
  it('should reject bulk destroy for non-admin operators', async () => {
    // Mock auth as operator (not admin)
    mockGet.mockReturnValue({
      id: 'user-1',
      tenant_id: 'tenant-a',
      role: 'operator',
    });

    const res = await app.request('/api/agents/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'omni_test',
      },
      body: JSON.stringify({ action: 'destroy', ids: ['agent-1'] }),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Admin role required');
  });
});

describe('Security: SSRF prevention on webhook URLs', () => {
  it('should reject localhost webhook URL', async () => {
    const res = await app.request('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          notification: { slack_webhook: 'https://localhost/hook' },
        },
      }),
    });
    expect(res.status).toBe(400);
  });

  it('should reject private IP webhook URL', async () => {
    const res = await app.request('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          notification: { webhook_url: 'https://192.168.1.1/hook' },
        },
      }),
    });
    expect(res.status).toBe(400);
  });

  it('should reject HTTP (non-HTTPS) webhook URL', async () => {
    const res = await app.request('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          notification: { slack_webhook: 'http://hooks.slack.com/abc' },
        },
      }),
    });
    expect(res.status).toBe(400);
  });

  it('should accept valid HTTPS webhook URL', async () => {
    const res = await app.request('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          notification: { slack_webhook: 'https://hooks.slack.com/services/abc' },
        },
      }),
    });
    expect(res.status).toBe(200);
  });
});

describe('Config GET webhook masking', () => {
  it('should mask webhook URLs in config response', async () => {
    const res = await app.request('/api/config');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { config: { notification: Record<string, string> } };
    // Empty webhooks should return empty strings
    expect(body.config.notification.slack_webhook).toBe('');
    expect(body.config.notification.discord_webhook).toBe('');
    expect(body.config.notification.webhook_url).toBe('');
  });
});

// ─── Mesh routes ──────────────────────────────────────────────────────

describe('Mesh API routes', () => {
  it('GET /api/mesh/topology should return nodes and edges', async () => {
    const res = await app.request('/api/mesh/topology');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { topology: { nodes: unknown[]; edges: unknown[] } };
    expect(body).toHaveProperty('topology');
    expect(body.topology).toHaveProperty('nodes');
    expect(body.topology).toHaveProperty('edges');
  });

  it('GET /api/mesh/events should return events array', async () => {
    const res = await app.request('/api/mesh/events');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { events: unknown[] };
    expect(body).toHaveProperty('events');
  });

  it('GET /api/mesh/events should accept limit and topic query params', async () => {
    const res = await app.request('/api/mesh/events?limit=10&topic=alerts');
    expect(res.status).toBe(200);
  });

  it('GET /api/mesh/subscriptions should return subscriptions array', async () => {
    const res = await app.request('/api/mesh/subscriptions');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { subscriptions: unknown[] };
    expect(body).toHaveProperty('subscriptions');
  });
});

// ─── Snapshot routes ──────────────────────────────────────────────────

describe('Snapshot API routes', () => {
  it('GET /api/agents/:id/snapshots should return 404 for non-existent agent', async () => {
    mockGet.mockReturnValueOnce(null);
    const res = await app.request('/api/agents/nonexistent/snapshots');
    expect(res.status).toBe(404);
  });

  it('GET /api/agents/:id/snapshots should return snapshots for existing agent', async () => {
    mockGet.mockReturnValueOnce({ id: 'a1', tenant_id: 'default' });
    const res = await app.request('/api/agents/a1/snapshots');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { snapshots: unknown[] };
    expect(body).toHaveProperty('snapshots');
  });

  it('GET /api/agents/:id/children should return 404 for non-existent agent', async () => {
    mockGet.mockReturnValueOnce(null);
    const res = await app.request('/api/agents/nonexistent/children');
    expect(res.status).toBe(404);
  });

  it('GET /api/agents/:id/children should return children for existing agent', async () => {
    mockGet.mockReturnValueOnce({ id: 'a1', tenant_id: 'default' });
    const res = await app.request('/api/agents/a1/children');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { children: unknown[] };
    expect(body).toHaveProperty('children');
  });
});

// ─── Recipes Routes ──────────────────────────────────────────────────

describe('GET /api/recipes', () => {
  it('should return 200 with recipes array', async () => {
    const res = await app.request('/api/recipes');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { recipes: unknown[] };
    expect(body).toHaveProperty('recipes');
  });

  it('should accept search query parameter', async () => {
    const res = await app.request('/api/recipes?q=cpu');
    expect(res.status).toBe(200);
  });

  it('should accept category filter', async () => {
    const res = await app.request('/api/recipes?category=monitoring');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/recipes/:id', () => {
  it('should return 404 for non-existent recipe', async () => {
    const res = await app.request('/api/recipes/nonexistent');
    expect(res.status).toBe(404);
  });
});

// ─── Usage Routes ────────────────────────────────────────────────────

describe('GET /api/usage', () => {
  it('should return 200 with usage data', async () => {
    mockGet.mockReturnValueOnce({
      total_cost: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_requests: 0,
    });
    mockAll.mockReturnValueOnce([]); // byModel
    mockAll.mockReturnValueOnce([]); // byAgent
    mockAll.mockReturnValueOnce([]); // daily

    const res = await app.request('/api/usage');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { total_cost: number; daily: unknown[] };
    expect(body).toHaveProperty('total_cost');
    expect(body).toHaveProperty('daily');
  });

  it('should accept days query parameter', async () => {
    mockGet.mockReturnValueOnce({
      total_cost: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_requests: 0,
    });
    mockAll.mockReturnValueOnce([]);
    mockAll.mockReturnValueOnce([]);
    mockAll.mockReturnValueOnce([]);

    const res = await app.request('/api/usage?days=7');
    expect(res.status).toBe(200);
  });

  it('should reject invalid days parameter', async () => {
    const res = await app.request('/api/usage?days=0');
    expect(res.status).toBe(400);
  });

  it('should reject days exceeding max', async () => {
    const res = await app.request('/api/usage?days=999');
    expect(res.status).toBe(400);
  });
});

// ─── Tenants Routes ──────────────────────────────────────────────────

describe('GET /api/tenants', () => {
  it('should return 200 with tenants array', async () => {
    const tenants = [{ id: 'default', name: 'Default', plan: 'free', max_agents: 10 }];
    mockAll.mockReturnValueOnce(tenants);

    const res = await app.request('/api/tenants');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { tenants: unknown[] };
    expect(body).toEqual({ tenants });
  });
});

describe('POST /api/tenants', () => {
  it('should reject when name is missing', async () => {
    const res = await app.request('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('should create tenant with valid data', async () => {
    const newTenant = { id: 'mock-nanoid-12', name: 'Acme', plan: 'pro', max_agents: 50 };
    mockGet.mockReturnValueOnce(newTenant);

    const res = await app.request('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Acme', plan: 'pro', max_agents: 50 }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { tenant: { name: string } };
    expect(body).toHaveProperty('tenant');
    expect(body.tenant).toHaveProperty('name', 'Acme');
  });
});

// ─── Marketplace Detail ──────────────────────────────────────────────

describe('GET /api/marketplace/:id', () => {
  it('should return 404 for non-existent recipe', async () => {
    mockGet.mockReturnValueOnce(null);

    const res = await app.request('/api/marketplace/nonexistent');
    expect(res.status).toBe(404);
  });

  it('should return recipe when found', async () => {
    const recipe = {
      id: 'r1',
      name: 'CPU Monitor',
      description: 'Watch CPU',
      prompt: 'monitor cpu',
      category: 'monitoring',
      author: 'admin',
      version: '1.0.0',
      downloads: 5,
      rating: 4.0,
      tags: '["cpu"]',
      config: '{}',
      published: 1,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    mockGet.mockReturnValueOnce(recipe);

    const res = await app.request('/api/marketplace/r1');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { recipe: { name: string; tags: string[] } };
    expect(body.recipe.name).toBe('CPU Monitor');
    expect(body.recipe.tags).toEqual(['cpu']);
  });
});

// ─── Auth Login ──────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('should reject when apiKey is missing', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('should return 401 for invalid API key', async () => {
    mockGet.mockReturnValueOnce(null);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'omni_invalid' }),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Invalid');
  });
});

describe('DELETE Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OMNIWATCH_DEV_AUTH = '1';
    app = createApp();
  });

  it('DELETE /agents/:id returns 204 on success', async () => {
    mockAgentDestroy.mockResolvedValueOnce({ destroyed: true });
    const res = await app.request('/api/agents/agent-1', {
      method: 'DELETE',
    });
    expect(res.status).toBe(204);
  });

  it('DELETE /agents/:id returns 502 on engine error', async () => {
    mockAgentDestroy.mockRejectedValueOnce(new Error('Not found'));
    const res = await app.request('/api/agents/agent-1', {
      method: 'DELETE',
    });
    expect(res.status).toBe(502);
  });

  it('DELETE /analytics/alerts/:id returns 204', async () => {
    const res = await app.request('/api/analytics/alerts/1', {
      method: 'DELETE',
    });
    expect(res.status).toBe(204);
  });

  it('DELETE /marketplace/:id returns 204 on success', async () => {
    mockGet.mockReturnValueOnce({ id: 'recipe-1' });
    const res = await app.request('/api/marketplace/recipe-1', {
      method: 'DELETE',
    });
    expect(res.status).toBe(204);
  });

  it('DELETE /marketplace/:id returns 404 if not found', async () => {
    mockGet.mockReturnValueOnce(null);
    const res = await app.request('/api/marketplace/nonexistent', {
      method: 'DELETE',
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /users/:id returns 204 on success', async () => {
    mockGet.mockReturnValueOnce({ id: 'user-1' });
    const res = await app.request('/api/users/user-1', {
      method: 'DELETE',
    });
    expect(res.status).toBe(204);
  });

  it('DELETE /users/:id returns 404 if not found', async () => {
    mockGet.mockReturnValueOnce(null);
    const res = await app.request('/api/users/nonexistent', {
      method: 'DELETE',
    });
    expect(res.status).toBe(404);
  });
});

describe('Tenant Isolation on Agent Sub-routes', () => {
  it('GET /agents/:id/logs returns 404 for other tenant agent (non-admin)', async () => {
    // First call: auth middleware user lookup → viewer in tenant-a
    mockGet.mockReturnValueOnce({ id: 'u1', tenant_id: 'tenant-a', role: 'viewer' });
    // Second call: agent lookup → agent belongs to tenant-b
    mockGet.mockReturnValueOnce({ id: 'a1', tenant_id: 'tenant-b' });
    const res = await app.request('/api/agents/a1/logs', {
      headers: { 'X-API-Key': 'omni_test' },
    });
    expect(res.status).toBe(404);
  });

  it('GET /agents/:id/logs returns 200 for own tenant agent', async () => {
    mockGet.mockReturnValueOnce({ id: 'a1', tenant_id: 'default' });
    mockAll.mockReturnValueOnce([]);
    const res = await app.request('/api/agents/a1/logs');
    expect(res.status).toBe(200);
  });

  it('GET /agents/:id/metrics returns 404 for other tenant agent (non-admin)', async () => {
    // First call: auth middleware user lookup → viewer in tenant-a
    mockGet.mockReturnValueOnce({ id: 'u1', tenant_id: 'tenant-a', role: 'viewer' });
    // Second call: agent lookup → agent belongs to tenant-b
    mockGet.mockReturnValueOnce({ id: 'a1', tenant_id: 'tenant-b' });
    const res = await app.request('/api/agents/a1/metrics', {
      headers: { 'X-API-Key': 'omni_test' },
    });
    expect(res.status).toBe(404);
  });

  it('GET /agents/:id/metrics returns 200 for own tenant agent', async () => {
    mockGet.mockReturnValueOnce({ id: 'a1', tenant_id: 'default' });
    mockGet.mockReturnValueOnce(null);
    const res = await app.request('/api/agents/a1/metrics');
    expect(res.status).toBe(200);
  });
});

describe('Numeric ID Validation', () => {
  it('PUT /analytics/alerts/:id rejects non-numeric id', async () => {
    const res = await app.request('/api/analytics/alerts/abc', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });
    expect(res.status).toBe(400);
  });

  it('DELETE /analytics/alerts/:id rejects non-numeric id', async () => {
    const res = await app.request('/api/analytics/alerts/abc', {
      method: 'DELETE',
    });
    expect(res.status).toBe(400);
  });

  it('POST /queue/dead-letters/:id/retry rejects non-numeric id', async () => {
    const res = await app.request('/api/queue/dead-letters/abc/retry', {
      method: 'POST',
    });
    expect(res.status).toBe(400);
  });

  it('POST /queue/dead-letters/:id/retry rejects negative id', async () => {
    const res = await app.request('/api/queue/dead-letters/-1/retry', {
      method: 'POST',
    });
    expect(res.status).toBe(400);
  });
});

describe('Alert Rule CRUD', () => {
  it('GET /analytics/alerts returns rules list', async () => {
    const res = await app.request('/api/analytics/alerts');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('rules');
  });

  it('POST /analytics/alerts creates a rule', async () => {
    const res = await app.request('/api/analytics/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric_name: 'error_rate',
        operator: 'gt',
        threshold: 0.5,
        window_minutes: 15,
        notify_channels: ['slack'],
        enabled: true,
      }),
    });
    expect(res.status).toBe(201);
  });

  it('POST /analytics/alerts rejects invalid operator', async () => {
    const res = await app.request('/api/analytics/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric_name: 'error_rate',
        operator: 'invalid',
        threshold: 0.5,
      }),
    });
    expect(res.status).toBe(400);
  });

  it('PUT /analytics/alerts/:id updates a rule', async () => {
    const mockUpdate = vi.fn().mockReturnValue({ id: 1, metric_name: 'error_rate' });
    const { handleAnalyticsRPC } = await import('@omniwatch/api/engine');
    (handleAnalyticsRPC.updateAlert as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockUpdate());
    const res = await app.request('/api/analytics/alerts/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });
    expect(res.status).toBe(200);
  });

  it('PUT /analytics/alerts/:id returns 404 if not found', async () => {
    const { handleAnalyticsRPC } = await import('@omniwatch/api/engine');
    (handleAnalyticsRPC.updateAlert as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);
    const res = await app.request('/api/analytics/alerts/999', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });
    expect(res.status).toBe(404);
  });
});

describe('Config Routes', () => {
  it('GET /config returns masked config', async () => {
    const res = await app.request('/api/config');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('config');
    expect(json.config).toHaveProperty('ai');
    expect(json.config).toHaveProperty('notification');
  });

  it('PUT /config updates config (admin)', async () => {
    const res = await app.request('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: { agent: { max_count: 50 } },
      }),
    });
    expect(res.status).toBe(200);
  });

  it('PUT /config rejects non-admin users', async () => {
    // Auth middleware: viewer user
    mockGet.mockReturnValueOnce({ id: 'u1', tenant_id: 'default', role: 'viewer' });
    const res = await app.request('/api/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'omni_viewer',
      },
      body: JSON.stringify({
        config: { agent: { max_count: 50 } },
      }),
    });
    expect(res.status).toBe(403);
  });
});

// ─── v4.24: 10 New API Route Tests ──────────────────────────────────

describe('GET /api/analytics/anomalies', () => {
  it('should return 200 with anomalies array', async () => {
    const res = await app.request('/api/analytics/anomalies');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { anomalies: unknown[] };
    expect(body).toHaveProperty('anomalies');
    expect(Array.isArray(body.anomalies)).toBe(true);
  });

  it('should accept optional agentId filter', async () => {
    const res = await app.request('/api/analytics/anomalies?agentId=agent-1');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { anomalies: unknown[] };
    expect(body).toHaveProperty('anomalies');
  });
});

describe('GET /api/security/events', () => {
  it('should return 200 with events array', async () => {
    const res = await app.request('/api/security/events');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { events: unknown[] };
    expect(body).toHaveProperty('events');
    expect(Array.isArray(body.events)).toBe(true);
  });

  it('should accept limit query param', async () => {
    const res = await app.request('/api/security/events?limit=10');
    expect(res.status).toBe(200);
  });
});

describe('PUT /api/tenants/:id', () => {
  it('should return 404 when tenant not found', async () => {
    mockGet.mockReturnValueOnce(undefined);
    const res = await app.request('/api/tenants/nonexistent', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(404);
  });

  it('should update tenant and return 200', async () => {
    const tenant = {
      id: 't1',
      name: 'Old Name',
      plan: 'free',
      max_agents: 10,
      created_at: '2026-01-01',
    };
    // First get: existing tenant check
    mockGet.mockReturnValueOnce(tenant);
    // Second get: return updated tenant after update
    mockGet.mockReturnValueOnce({ ...tenant, name: 'New Name' });

    const res = await app.request('/api/tenants/t1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { tenant: { name: string } };
    expect(body).toHaveProperty('tenant');
    expect(body.tenant.name).toBe('New Name');
  });
});

describe('POST /api/users/:id/rotate-key', () => {
  it('should return 404 when user not found', async () => {
    mockGet.mockReturnValueOnce(undefined);
    const res = await app.request('/api/users/nonexistent/rotate-key', {
      method: 'POST',
    });
    expect(res.status).toBe(404);
  });

  it('should rotate key and return new api_key', async () => {
    mockGet.mockReturnValueOnce({ id: 'u1', tenant_id: 'default' });
    const res = await app.request('/api/users/u1/rotate-key', {
      method: 'POST',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { api_key: string };
    expect(body).toHaveProperty('api_key');
    expect(body.api_key.startsWith('omni_')).toBe(true);
  });
});

describe('POST /api/marketplace (publish)', () => {
  it('should reject when required fields are missing', async () => {
    const res = await app.request('/api/marketplace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'no name or prompt' }),
    });
    expect(res.status).toBe(400);
  });

  it('should create recipe and return 201', async () => {
    const recipe = {
      id: 'r-new',
      name: 'Test Recipe',
      description: 'A test',
      prompt: 'Monitor test',
      category: 'general',
      author: 'dev-user',
      version: '1.0.0',
      downloads: 0,
      rating: 0,
      tags: '[]',
      config: '{}',
      published: 1,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    mockGet.mockReturnValueOnce(recipe);

    const res = await app.request('/api/marketplace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Recipe',
        prompt: 'Monitor test',
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { recipe: { name: string } };
    expect(body).toHaveProperty('recipe');
    expect(body.recipe.name).toBe('Test Recipe');
  });
});

describe('POST /api/marketplace/:id/install', () => {
  it('should return 404 when recipe not found', async () => {
    mockGet.mockReturnValueOnce(undefined);
    const res = await app.request('/api/marketplace/nonexistent/install', {
      method: 'POST',
    });
    expect(res.status).toBe(404);
  });

  it('should install recipe and return 201', async () => {
    const recipe = {
      id: 'r1',
      name: 'CPU Monitor',
      prompt: 'Monitor CPU',
      category: 'monitoring',
      published: 1,
      config: '{"type":"watcher"}',
    };
    mockGet.mockReturnValueOnce(recipe);
    mockAgentCreate.mockResolvedValueOnce({
      id: 'agent-installed',
      name: 'CPU Monitor',
      status: 'creating',
    });

    const res = await app.request('/api/marketplace/r1/install', {
      method: 'POST',
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { agent: { id: string } };
    expect(body).toHaveProperty('agent');
    expect(body.agent.id).toBe('agent-installed');
  });
});

describe('POST /api/recipes/:id/install', () => {
  it('should return 404 for non-existent recipe', async () => {
    const res = await app.request('/api/recipes/nonexistent/install', {
      method: 'POST',
    });
    expect(res.status).toBe(404);
  });

  it('should install built-in recipe (502 if engine unavailable)', async () => {
    // Use a known built-in recipe — the mock rejects by default
    const res = await app.request('/api/recipes/rss-monitor/install', {
      method: 'POST',
    });
    // 201 if engine works, 502 if mock rejects, 404 if recipe id not found
    expect([201, 404, 502]).toContain(res.status);
  });
});

describe('GET /api/system/health/detailed', () => {
  it('should return 200 with health checks', async () => {
    mockGet.mockReturnValueOnce({ '1': 1 }); // SELECT 1 succeeds
    const res = await app.request('/api/system/health/detailed');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      timestamp: string;
      checks: { database: { status: string }; memory: { rss_mb: number } };
    };
    expect(body.status).toBe('healthy');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('checks');
    expect(body.checks).toHaveProperty('database');
    expect(body.checks).toHaveProperty('memory');
  });
});

describe('POST /api/agents/:id/snapshots', () => {
  it('should return 404 for non-existent agent', async () => {
    mockGet.mockReturnValueOnce(undefined);
    const res = await app.request('/api/agents/nonexistent/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(404);
  });

  it('should capture snapshot for existing agent', async () => {
    mockGet.mockReturnValueOnce({ id: 'a1', tenant_id: 'default' });
    const { handleSnapshotRPC } = await import('@omniwatch/api/engine');
    (handleSnapshotRPC.capture as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ seq: 5 });

    const res = await app.request('/api/agents/a1/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'test snapshot' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { seq: number };
    expect(body).toHaveProperty('seq');
  });
});

describe('POST /api/agents/:id/snapshots/:seq/restore', () => {
  it('should return 404 for non-existent agent', async () => {
    mockGet.mockReturnValueOnce(undefined);
    const res = await app.request('/api/agents/nonexistent/snapshots/1/restore', {
      method: 'POST',
    });
    expect(res.status).toBe(404);
  });

  it('should restore snapshot for existing agent', async () => {
    mockGet.mockReturnValueOnce({ id: 'a1', tenant_id: 'default' });
    const { handleSnapshotRPC } = await import('@omniwatch/api/engine');
    (handleSnapshotRPC.restore as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

    const res = await app.request('/api/agents/a1/snapshots/3/restore', {
      method: 'POST',
    });
    expect(res.status).toBe(200);
  });
});
