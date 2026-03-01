import { describe, it, expect } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:3456';

describe('E2E: API Endpoints', () => {
  it('GET /health returns 200', async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('GET /api/system/health/detailed returns version', async () => {
    const res = await fetch(`${API_URL}/api/system/health/detailed`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.version).toBeDefined();
    expect(data.checks).toBeDefined();
  });

  it('GET /api/agents returns 401 without API key', async () => {
    const res = await fetch(`${API_URL}/api/agents`);
    expect(res.status).toBe(401);
  });

  it('GET /api/docs/spec returns OpenAPI spec', async () => {
    const res = await fetch(`${API_URL}/api/docs/spec`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.openapi).toBe('3.0.3');
  });

  it('GET /api/system/status returns system info', async () => {
    const res = await fetch(`${API_URL}/api/system/status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.agentCount).toBe('number');
    expect(typeof data.daemonRunning).toBe('boolean');
  });
});
