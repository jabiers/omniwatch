import { describe, it, expect } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:3456';

describe('E2E: Authentication Flow', () => {
  it('POST /auth/login with invalid key returns 401', async () => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'omni_invalid_key_000000000000000' }),
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('GET /api/agents with invalid API key returns 401', async () => {
    const res = await fetch(`${API_URL}/api/agents`, {
      headers: { 'X-API-Key': 'omni_fake_key_00000000000000000' },
    });
    expect(res.status).toBe(401);
  });

  it('GET /api/agents with invalid Bearer token returns 401', async () => {
    const res = await fetch(`${API_URL}/api/agents`, {
      headers: { Authorization: 'Bearer invalid-token-123' },
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/agents without auth returns 401', async () => {
    const res = await fetch(`${API_URL}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test', type: 'watcher' }),
    });
    expect(res.status).toBe(401);
  });

  it('protected admin routes return 401 without auth', async () => {
    const adminPaths = ['/api/tenants', '/api/users', '/api/security/events'];
    for (const path of adminPaths) {
      const res = await fetch(`${API_URL}${path}`);
      expect(res.status).toBe(401);
    }
  });
});
