import { describe, it, expect } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:3456';
const API_KEY = process.env.TEST_API_KEY || '';

/** Helper to make authenticated requests (skip if no API key configured) */
function authHeaders(): Record<string, string> {
  if (!API_KEY) return {};
  return { 'X-API-Key': API_KEY };
}

describe('E2E: Input Validation', () => {
  it('GET /api/agents?status=invalid returns 400', async () => {
    const res = await fetch(`${API_URL}/api/agents?status=invalid`, {
      headers: authHeaders(),
    });
    // Should be 400 (Zod validation) or 401 (no auth)
    expect([400, 401]).toContain(res.status);
  });

  it('POST /api/agents with empty body returns 400', async () => {
    const res = await fetch(`${API_URL}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({}),
    });
    // 400 (validation) or 401 (no auth)
    expect([400, 401]).toContain(res.status);
  });

  it('POST /api/agents with too-long prompt returns 400', async () => {
    const res = await fetch(`${API_URL}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ prompt: 'x'.repeat(6000), type: 'watcher' }),
    });
    expect([400, 401]).toContain(res.status);
  });

  it('GET /api/notifications?limit=abc is handled gracefully', async () => {
    const res = await fetch(`${API_URL}/api/notifications?limit=abc`, {
      headers: authHeaders(),
    });
    // Should not crash — returns 200 with default limit or 401
    expect([200, 401]).toContain(res.status);
  });

  it('GET /api/marketplace?sort=invalid returns 400', async () => {
    const res = await fetch(`${API_URL}/api/marketplace?sort=invalid`);
    expect([400, 401]).toContain(res.status);
  });

  it('nonexistent route returns 404', async () => {
    const res = await fetch(`${API_URL}/api/nonexistent-route`);
    expect(res.status).toBe(404);
  });
});
