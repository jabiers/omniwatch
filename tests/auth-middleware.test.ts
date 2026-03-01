import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- SQL-aware mock state ---
// Track mockGet calls with SQL context for debugging
const mockGet = vi.fn();
const mockRun = vi.fn();
const mockAll = vi.fn().mockReturnValue([]);

// We need prepare() to return functions that share the same mock queue.
// The key insight: mockReturnValueOnce is consumed in order, so we must
// set up mocks in the EXACT order that DB calls occur:
//   1. Auth middleware's DB call (if any — api key lookup or session lookup)
//   2. Route handler's DB calls
vi.mock('@omniwatch/db', () => ({
  getDb: () => ({
    prepare: (_sql: string) => ({
      run: (...args: unknown[]) => mockRun(...args),
      get: (...args: unknown[]) => mockGet(...args),
      all: (...args: unknown[]) => mockAll(...args),
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

import { createApp } from '../apps/api/src/app.js';

describe('Auth Middleware', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAll.mockReturnValue([]);
    process.env.NODE_ENV = 'test'; // non-production = dev mode
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  // ─── Public Paths ──────────────────────────────────────────────────

  describe('Public paths bypass auth', () => {
    it('/health should not require auth and return 200', async () => {
      const app = createApp();
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      expect((await res.json()).status).toBe('ok');
    });

    it('/api/system/status should be accessible without auth even in production', async () => {
      process.env.NODE_ENV = 'production';
      const app = createApp();

      // system/status is a PUBLIC_PATH — auth middleware assigns anonymous viewer
      // Route handler makes 2 db.prepare().get() calls for agent counts
      mockGet.mockReturnValueOnce({ count: 0 }); // agentCount
      mockGet.mockReturnValueOnce({ count: 0 }); // runningCount

      const res = await app.request('/api/system/status');
      expect(res.status).toBe(200);
    });

    it('/auth/* routes should be accessible without auth middleware blocking', async () => {
      process.env.NODE_ENV = 'production';
      const app = createApp();

      // POST /auth/login — the auth middleware does NOT run for this path
      // (it's mounted at /api/* only, and /auth/login is on the oauth routes at root level)
      // The login handler calls db.prepare().get() to look up user by api_key_hash
      mockGet.mockReturnValueOnce(null); // user not found

      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'omni_invalid' }),
      });
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Invalid API key');
    });
  });

  // ─── Dev Mode (non-production) ─────────────────────────────────────

  describe('Dev mode (NODE_ENV != production)', () => {
    it('should allow access to protected routes without API key', async () => {
      const app = createApp();
      // Dev mode: auth middleware assigns admin role, no DB call
      // GET /api/agents: admin sees all agents → db.prepare().all()
      mockAll.mockReturnValueOnce([]);

      const res = await app.request('/api/agents');
      expect(res.status).toBe(200);
    });

    it('should assign admin role in dev mode (can access admin-only routes)', async () => {
      const app = createApp();
      // Dev mode: admin auto-assigned
      // POST /api/agents: requireRole('admin', 'operator') passes
      // rpcCall is mocked to reject → 502
      const res = await app.request('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test prompt', type: 'watcher' }),
      });
      // Auth passes (admin), rpcCall fails → 502
      expect(res.status).toBe(502);
    });
  });

  // ─── Production Mode ──────────────────────────────────────────────

  describe('Production mode (NODE_ENV = production)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should return 401 when no API key or Bearer token provided', async () => {
      const app = createApp();
      const res = await app.request('/api/agents');
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toContain('API key or Bearer token required');
    });
  });

  // ─── API Key Authentication ────────────────────────────────────────

  describe('API key authentication', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should authenticate with valid API key and access agents list', async () => {
      const app = createApp();
      const apiKey = 'omni_' + 'a'.repeat(32);

      // Call order:
      // 1. Auth middleware: db.prepare('SELECT u.id... WHERE u.api_key_hash = ?').get(keyHash)
      mockGet.mockReturnValueOnce({ id: 'user-1', tenant_id: 'tenant-1', role: 'admin' });
      // 2. GET /api/agents handler (admin, no tenant filter): db.prepare().all('destroyed')
      const agents = [{ id: 'agent-1', name: 'test', status: 'running' }];
      mockAll.mockReturnValueOnce(agents);

      const res = await app.request('/api/agents', {
        headers: { 'X-API-Key': apiKey },
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.agents).toEqual(agents);
    });

    it('should return 401 with invalid API key', async () => {
      const app = createApp();
      // Auth middleware: db lookup returns null (key not found)
      mockGet.mockReturnValueOnce(null);

      const res = await app.request('/api/agents', {
        headers: { 'X-API-Key': 'omni_invalid' },
      });
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toBe('Invalid API key');
    });
  });

  // ─── Bearer Token (OAuth Session) ─────────────────────────────────

  describe('Bearer token authentication', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should authenticate with valid Bearer token', async () => {
      const app = createApp();

      // Call order:
      // 1. Auth middleware: db.prepare('SELECT u.id... FROM oauth_sessions...').get(token)
      mockGet.mockReturnValueOnce({ id: 'user-2', tenant_id: 'tenant-2', role: 'admin' });
      // 2. GET /api/agents: db.prepare().all()
      mockAll.mockReturnValueOnce([]);

      const res = await app.request('/api/agents', {
        headers: { Authorization: 'Bearer valid-session-token' },
      });
      expect(res.status).toBe(200);
    });

    it('should return 401 with invalid Bearer token in production', async () => {
      const app = createApp();
      // Auth middleware: session lookup returns null
      mockGet.mockReturnValueOnce(null);

      const res = await app.request('/api/agents', {
        headers: { Authorization: 'Bearer invalid-token' },
      });
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toContain('Invalid credentials');
    });

    it('should fall through to 401 when Bearer token is invalid even in dev mode', async () => {
      process.env.NODE_ENV = 'test'; // dev mode
      const app = createApp();

      // Auth middleware: session lookup fails
      mockGet.mockReturnValueOnce(null);

      const res = await app.request('/api/agents', {
        headers: { Authorization: 'Bearer invalid-token' },
      });
      // Bearer is set, session lookup fails, !apiKey && !authHeader is false
      // Falls through to "Invalid credentials" 401
      expect(res.status).toBe(401);
    });
  });

  // ─── requireRole RBAC ─────────────────────────────────────────────

  describe('requireRole RBAC', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('admin can access admin-only routes (DELETE /api/marketplace/:id)', async () => {
      const app = createApp();
      const apiKey = 'omni_' + 'a'.repeat(32);

      // 1. Auth middleware: admin user lookup
      mockGet.mockReturnValueOnce({ id: 'admin-1', tenant_id: 'default', role: 'admin' });
      // 2. DELETE /api/marketplace/:id handler: recipe lookup
      mockGet.mockReturnValueOnce({ id: 'recipe-1' });
      // 3. DELETE run (no return needed)

      const res = await app.request('/api/marketplace/recipe-1', {
        method: 'DELETE',
        headers: { 'X-API-Key': apiKey },
      });
      expect(res.status).toBe(200);
    });

    it('viewer cannot access admin-only routes → 403', async () => {
      const app = createApp();
      const apiKey = 'omni_' + 'b'.repeat(32);

      // 1. Auth middleware: viewer user lookup
      mockGet.mockReturnValueOnce({ id: 'viewer-1', tenant_id: 'default', role: 'viewer' });
      // requireRole('admin') should reject → 403 before handler runs

      const res = await app.request('/api/marketplace/recipe-1', {
        method: 'DELETE',
        headers: { 'X-API-Key': apiKey },
      });
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.error).toBe('Insufficient permissions');
    });

    it('operator cannot access admin-only routes → 403', async () => {
      const app = createApp();
      const apiKey = 'omni_' + 'c'.repeat(32);

      // 1. Auth middleware: operator user lookup
      mockGet.mockReturnValueOnce({ id: 'op-1', tenant_id: 'default', role: 'operator' });

      const res = await app.request('/api/marketplace/recipe-1', {
        method: 'DELETE',
        headers: { 'X-API-Key': apiKey },
      });
      expect(res.status).toBe(403);
    });

    it('operator can access operator+ routes (POST /api/agents)', async () => {
      const app = createApp();
      const apiKey = 'omni_' + 'd'.repeat(32);

      // 1. Auth middleware: operator user lookup
      mockGet.mockReturnValueOnce({ id: 'op-2', tenant_id: 'default', role: 'operator' });
      // 2. POST /api/agents: requireRole('admin', 'operator') passes
      //    rpcCall is mocked → either resolves or rejects

      const { rpcCall } = await import('../apps/api/src/lib/rpc-bridge.js');
      vi.mocked(rpcCall).mockResolvedValueOnce({ id: 'agent-new' });

      const res = await app.request('/api/agents', {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: 'test prompt', type: 'watcher' }),
      });
      // 201 = success (operator has permission)
      expect(res.status).toBe(201);
    });

    it('viewer cannot access operator+ routes (POST /api/agents) → 403', async () => {
      const app = createApp();
      const apiKey = 'omni_' + 'e'.repeat(32);

      // 1. Auth middleware: viewer user lookup
      mockGet.mockReturnValueOnce({ id: 'viewer-2', tenant_id: 'default', role: 'viewer' });
      // requireRole('admin', 'operator') should reject → 403

      const res = await app.request('/api/agents', {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: 'test prompt', type: 'watcher' }),
      });
      expect(res.status).toBe(403);
    });

    it('admin can access operator+ routes', async () => {
      const app = createApp();
      const apiKey = 'omni_' + 'f'.repeat(32);

      // 1. Auth middleware: admin user lookup
      mockGet.mockReturnValueOnce({ id: 'admin-2', tenant_id: 'default', role: 'admin' });

      const { rpcCall } = await import('../apps/api/src/lib/rpc-bridge.js');
      vi.mocked(rpcCall).mockResolvedValueOnce({ id: 'agent-new' });

      const res = await app.request('/api/agents', {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: 'test prompt', type: 'watcher' }),
      });
      expect(res.status).toBe(201);
    });
  });

  // ─── MCP Path Bypass ──────────────────────────────────────────────

  describe('MCP paths bypass auth', () => {
    it('/api/mcp paths should be accessible without auth in production', async () => {
      process.env.NODE_ENV = 'production';
      const app = createApp();

      // MCP routes: auth middleware skips auth and assigns anonymous viewer
      // The MCP endpoint itself may return any status, but NOT 401
      const res = await app.request('/api/mcp');
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  // ─── Tenant Isolation ─────────────────────────────────────────────

  describe('Tenant isolation via auth context', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('non-admin user sees only their tenant agents', async () => {
      const app = createApp();
      const apiKey = 'omni_' + '1'.repeat(32);

      // 1. Auth middleware: operator in tenant-1
      mockGet.mockReturnValueOnce({ id: 'user-t1', tenant_id: 'tenant-1', role: 'operator' });
      // 2. GET /api/agents handler (non-admin → filter by tenant_id)
      const tenantAgents = [{ id: 'agent-t1', tenant_id: 'tenant-1', status: 'running' }];
      mockAll.mockReturnValueOnce(tenantAgents);

      const res = await app.request('/api/agents', {
        headers: { 'X-API-Key': apiKey },
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.agents).toEqual(tenantAgents);
    });

    it('non-admin cannot access another tenant agent detail → 404', async () => {
      const app = createApp();
      const apiKey = 'omni_' + '2'.repeat(32);

      // 1. Auth middleware: operator in tenant-1
      mockGet.mockReturnValueOnce({ id: 'user-t1', tenant_id: 'tenant-1', role: 'operator' });
      // 2. GET /api/agents/:id handler: agent from tenant-2
      mockGet.mockReturnValueOnce({ id: 'agent-t2', tenant_id: 'tenant-2', status: 'running' });

      const res = await app.request('/api/agents/agent-t2', {
        headers: { 'X-API-Key': apiKey },
      });
      expect(res.status).toBe(404);
    });
  });
});
