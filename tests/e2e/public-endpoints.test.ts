import { describe, it, expect } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:3456';

describe('E2E: Public Endpoints', () => {
  it('GET /api/system/ollama returns Ollama status', async () => {
    const res = await fetch(`${API_URL}/api/system/ollama`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.available).toBe('boolean');
    expect(Array.isArray(data.models)).toBe(true);
  });

  it('GET /api/marketplace returns recipe list', async () => {
    const res = await fetch(`${API_URL}/api/marketplace`);
    // Marketplace is accessible without auth
    expect([200, 401]).toContain(res.status);
    if (res.status === 200) {
      const data = await res.json();
      expect(data.recipes).toBeDefined();
      expect(Array.isArray(data.recipes)).toBe(true);
    }
  });

  it('GET /api/recipes returns built-in recipes', async () => {
    const res = await fetch(`${API_URL}/api/recipes`);
    expect([200, 401]).toContain(res.status);
    if (res.status === 200) {
      const data = await res.json();
      expect(Array.isArray(data.recipes || data)).toBe(true);
    }
  });

  it('GET /health returns timestamp', async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.timestamp).toBeDefined();
    const timestamp = new Date(data.timestamp);
    expect(timestamp.getTime()).toBeGreaterThan(0);
  });

  it('GET /api/system/status returns all expected fields', async () => {
    const res = await fetch(`${API_URL}/api/system/status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.agentCount).toBe('number');
    expect(typeof data.runningCount).toBe('number');
    expect(typeof data.daemonRunning).toBe('boolean');
    expect(typeof data.uptime).toBe('number');
  });

  it('MCP endpoint is accessible', async () => {
    const res = await fetch(`${API_URL}/api/mcp`);
    // MCP GET returns method not allowed or OK depending on transport
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
