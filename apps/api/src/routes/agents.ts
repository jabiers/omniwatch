import { Hono } from 'hono';
import { getDb } from '@omniwatch/db';
import type { Agent, AgentLog } from '@omniwatch/shared';
import { rpcCall } from '../lib/rpc-bridge.js';

export const agentRoutes = new Hono();

/** GET /agents - list all agents with optional status filter */
agentRoutes.get('/agents', (c) => {
  const db = getDb();
  const status = c.req.query('status');

  let agents: Agent[];
  if (status) {
    agents = db.prepare('SELECT * FROM agents WHERE status = ? ORDER BY created_at DESC').all(status) as Agent[];
  } else {
    agents = db.prepare('SELECT * FROM agents WHERE status != ? ORDER BY created_at DESC').all('destroyed') as Agent[];
  }

  return c.json({ agents });
});

/** GET /agents/:id - single agent detail */
agentRoutes.get('/agents/:id', (c) => {
  const db = getDb();
  const { id } = c.req.param();

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as Agent | undefined;
  if (!agent) {
    return c.json({ error: `Agent '${id}' not found` }, 404);
  }

  return c.json({ agent });
});

/** POST /agents - create agent via daemon IPC */
agentRoutes.post('/agents', async (c) => {
  const body = await c.req.json<{ name?: string; prompt?: string; type?: string }>();

  if (!body.prompt) {
    return c.json({ error: 'prompt is required' }, 400);
  }

  try {
    const result = await rpcCall('agent.create', {
      name: body.name,
      prompt: body.prompt,
      type: body.type || 'watcher',
    });
    return c.json({ agent: result }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 502);
  }
});

/** DELETE /agents/:id - destroy agent via daemon IPC */
agentRoutes.delete('/agents/:id', async (c) => {
  const { id } = c.req.param();

  try {
    const result = await rpcCall('agent.destroy', { id });
    return c.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 502);
  }
});

/** POST /agents/:id/start - start agent via daemon IPC */
agentRoutes.post('/agents/:id/start', async (c) => {
  const { id } = c.req.param();

  try {
    const result = await rpcCall('agent.start', { id });
    return c.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 502);
  }
});

/** POST /agents/:id/stop - stop agent via daemon IPC */
agentRoutes.post('/agents/:id/stop', async (c) => {
  const { id } = c.req.param();

  try {
    const result = await rpcCall('agent.stop', { id });
    return c.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 502);
  }
});

/** POST /agents/:id/restart - restart agent via daemon IPC */
agentRoutes.post('/agents/:id/restart', async (c) => {
  const { id } = c.req.param();

  try {
    const result = await rpcCall('agent.restart', { id });
    return c.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 502);
  }
});

/** GET /agents/:id/logs - get agent logs with optional filters */
agentRoutes.get('/agents/:id/logs', (c) => {
  const db = getDb();
  const { id } = c.req.param();
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 500);
  const level = c.req.query('level');

  // Verify agent exists
  const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(id);
  if (!agent) {
    return c.json({ error: `Agent '${id}' not found` }, 404);
  }

  let logs: AgentLog[];
  if (level) {
    logs = db
      .prepare('SELECT * FROM agent_logs WHERE agent_id = ? AND level = ? ORDER BY created_at DESC LIMIT ?')
      .all(id, level, limit) as AgentLog[];
  } else {
    logs = db
      .prepare('SELECT * FROM agent_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(id, limit) as AgentLog[];
  }

  return c.json({ logs });
});

/** GET /agents/:id/metrics - get agent metrics */
agentRoutes.get('/agents/:id/metrics', (c) => {
  const db = getDb();
  const { id } = c.req.param();

  // Verify agent exists
  const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(id);
  if (!agent) {
    return c.json({ error: `Agent '${id}' not found` }, 404);
  }

  const metrics = db.prepare('SELECT * FROM agent_metrics WHERE agent_id = ?').get(id);
  if (!metrics) {
    return c.json({
      metrics: {
        agent_id: id,
        run_count: 0,
        success_count: 0,
        error_count: 0,
        avg_duration_ms: 0,
        last_duration_ms: 0,
      },
    });
  }

  return c.json({ metrics });
});
