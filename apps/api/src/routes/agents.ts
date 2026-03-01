import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '@omniwatch/db';
import type { Agent, AgentLog } from '@omniwatch/shared';
import { getErrorMessage } from '@omniwatch/shared';
import { handleAgentRPC } from '@omniwatch/daemon/engine';
import { requireRole } from '../middleware/auth.js';
import { broadcast } from '../ws.js';

/** Schema: POST /agents request body */
const createAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  prompt: z.string().min(1, 'prompt is required').max(5000),
  type: z.enum(['watcher', 'doer', 'auto']).default('watcher'),
});

/** Schema: GET /agents query params */
const listAgentsQuerySchema = z.object({
  status: z
    .enum(['creating', 'ready', 'running', 'stopped', 'error', 'healing', 'destroyed'])
    .optional(),
  tenant: z.string().optional(),
});

/** Schema: GET /agents/:id/logs query params */
const agentLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
  level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
});

export const agentRoutes = new Hono();

/** GET /agents - list all agents filtered by tenant */
agentRoutes.get('/agents', zValidator('query', listAgentsQuerySchema), (c) => {
  const db = getDb();
  const auth = c.get('auth');
  const { status, tenant } = c.req.valid('query');

  let agents: Agent[];
  if (auth.role === 'admin' && !tenant) {
    if (status) {
      agents = db
        .prepare(
          'SELECT id, name, type, status, prompt, sandbox_level, schedule, last_run, error_count, heal_count, parent_id, tenant_id, created_at, updated_at FROM agents WHERE status = ? ORDER BY created_at DESC',
        )
        .all(status) as Agent[];
    } else {
      agents = db
        .prepare(
          'SELECT id, name, type, status, prompt, sandbox_level, schedule, last_run, error_count, heal_count, parent_id, tenant_id, created_at, updated_at FROM agents WHERE status != ? ORDER BY created_at DESC',
        )
        .all('destroyed') as Agent[];
    }
  } else {
    const tenantId = tenant || auth.tenantId;
    if (status) {
      agents = db
        .prepare(
          'SELECT id, name, type, status, prompt, sandbox_level, schedule, last_run, error_count, heal_count, parent_id, tenant_id, created_at, updated_at FROM agents WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC',
        )
        .all(tenantId, status) as Agent[];
    } else {
      agents = db
        .prepare(
          'SELECT id, name, type, status, prompt, sandbox_level, schedule, last_run, error_count, heal_count, parent_id, tenant_id, created_at, updated_at FROM agents WHERE tenant_id = ? AND status != ? ORDER BY created_at DESC',
        )
        .all(tenantId, 'destroyed') as Agent[];
    }
  }

  return c.json({ agents });
});

/** GET /agents/:id - single agent detail */
agentRoutes.get('/agents/:id', (c) => {
  const db = getDb();
  const auth = c.get('auth');
  const { id } = c.req.param();

  const agent = db
    .prepare(
      'SELECT id, name, type, status, prompt, sandbox_level, schedule, last_run, error_count, heal_count, parent_id, tenant_id, created_at, updated_at FROM agents WHERE id = ?',
    )
    .get(id) as Agent | undefined;
  if (!agent) {
    return c.json({ error: `Agent '${id}' not found` }, 404);
  }

  if (auth.role !== 'admin' && agent.tenant_id !== auth.tenantId) {
    return c.json({ error: `Agent '${id}' not found` }, 404);
  }

  return c.json({ agent });
});

/** POST /agents - create agent via engine (operator+) */
agentRoutes.post(
  '/agents',
  requireRole('admin', 'operator'),
  zValidator('json', createAgentSchema),
  async (c) => {
    const body = c.req.valid('json');
    const auth = c.get('auth');

    try {
      const result = await handleAgentRPC.create({
        name: body.name,
        prompt: body.prompt,
        type: body.type,
        tenantId: auth.tenantId,
      });
      const created = result as { id?: string; name?: string };
      broadcast('agent:created', { id: created.id, name: created.name });
      return c.json({ agent: result }, 201);
    } catch (err) {
      return c.json({ error: getErrorMessage(err) }, 502);
    }
  },
);

/** DELETE /agents/:id - destroy agent via engine (operator+) */
agentRoutes.delete('/agents/:id', requireRole('admin', 'operator'), async (c) => {
  const { id } = c.req.param();

  try {
    const result = await handleAgentRPC.destroy({ id });
    broadcast('agent:destroyed', { id });
    return c.json({ result });
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 502);
  }
});

/** POST /agents/:id/start - start agent (operator+) */
agentRoutes.post('/agents/:id/start', requireRole('admin', 'operator'), async (c) => {
  const { id } = c.req.param();

  try {
    const result = await handleAgentRPC.start({ id });
    broadcast('agent:status', { id, status: 'running' });
    return c.json({ result });
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 502);
  }
});

/** POST /agents/:id/stop - stop agent (operator+) */
agentRoutes.post('/agents/:id/stop', requireRole('admin', 'operator'), async (c) => {
  const { id } = c.req.param();

  try {
    const result = await handleAgentRPC.stop({ id });
    broadcast('agent:status', { id, status: 'stopped' });
    return c.json({ result });
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 502);
  }
});

/** POST /agents/:id/restart - restart agent (operator+) */
agentRoutes.post('/agents/:id/restart', requireRole('admin', 'operator'), async (c) => {
  const { id } = c.req.param();

  try {
    const result = await handleAgentRPC.restart({ id });
    broadcast('agent:status', { id, status: 'running' });
    return c.json({ result });
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 502);
  }
});

/** Schema: POST /agents/bulk request body */
const bulkActionSchema = z.object({
  action: z.enum(['start', 'stop', 'restart', 'destroy']),
  ids: z.array(z.string().min(1)).min(1).max(50),
});

/** POST /agents/bulk - perform bulk action on multiple agents (operator+) */
agentRoutes.post(
  '/agents/bulk',
  requireRole('admin', 'operator'),
  zValidator('json', bulkActionSchema),
  async (c) => {
    const { action, ids } = c.req.valid('json');
    const auth = c.get('auth');
    const db = getDb();
    const results: { id: string; success: boolean; error?: string }[] = [];

    // Require admin for destroy action
    if (action === 'destroy' && auth.role !== 'admin') {
      return c.json({ error: 'Admin role required for bulk destroy' }, 403);
    }

    for (const id of ids) {
      try {
        // Tenant isolation: verify agent belongs to requesting user's tenant
        if (auth.role !== 'admin') {
          const agent = db.prepare('SELECT tenant_id FROM agents WHERE id = ?').get(id) as
            | { tenant_id: string }
            | undefined;
          if (!agent || agent.tenant_id !== auth.tenantId) {
            results.push({ id, success: false, error: 'Agent not found' });
            continue;
          }
        }

        const handler =
          action === 'start'
            ? handleAgentRPC.start
            : action === 'stop'
              ? handleAgentRPC.stop
              : action === 'restart'
                ? handleAgentRPC.restart
                : handleAgentRPC.destroy;
        await handler({ id });
        results.push({ id, success: true });
        if (action === 'destroy') {
          broadcast('agent:destroyed', { id });
        } else {
          const status = action === 'stop' ? 'stopped' : 'running';
          broadcast('agent:status', { id, status });
        }
      } catch (err) {
        results.push({ id, success: false, error: getErrorMessage(err) });
      }
    }

    return c.json({ results });
  },
);

/** GET /agents/:id/logs - get agent logs with optional filters */
agentRoutes.get('/agents/:id/logs', zValidator('query', agentLogsQuerySchema), (c) => {
  const db = getDb();
  const { id } = c.req.param();
  const { limit, level } = c.req.valid('query');

  const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(id);
  if (!agent) {
    return c.json({ error: `Agent '${id}' not found` }, 404);
  }

  let logs: AgentLog[];
  if (level) {
    logs = db
      .prepare(
        'SELECT id, agent_id, level, message, created_at FROM agent_logs WHERE agent_id = ? AND level = ? ORDER BY created_at DESC LIMIT ?',
      )
      .all(id, level, limit) as AgentLog[];
  } else {
    logs = db
      .prepare(
        'SELECT id, agent_id, level, message, created_at FROM agent_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?',
      )
      .all(id, limit) as AgentLog[];
  }

  return c.json({ logs });
});

/** GET /agents/:id/metrics - get agent metrics */
agentRoutes.get('/agents/:id/metrics', (c) => {
  const db = getDb();
  const { id } = c.req.param();

  const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(id);
  if (!agent) {
    return c.json({ error: `Agent '${id}' not found` }, 404);
  }

  const metrics = db
    .prepare(
      'SELECT agent_id, run_count, success_count, error_count, avg_duration_ms, last_duration_ms FROM agent_metrics WHERE agent_id = ?',
    )
    .get(id);
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
