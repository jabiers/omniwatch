/** Snapshot (Time Travel) API routes */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '@omniwatch/db';
import { handleSnapshotRPC } from '../engine/engine.js';
import { getErrorMessage } from '@omniwatch/shared';

export const snapshotRoutes = new Hono();

/** Verify agent exists and belongs to the user's tenant */
function verifyAgentAccess(
  db: ReturnType<typeof getDb>,
  agentId: string,
  auth: { tenantId: string; role: string },
): { id: string } | null {
  const agent = db.prepare('SELECT id, tenant_id FROM agents WHERE id = ?').get(agentId) as {
    id: string;
    tenant_id: string;
  } | null;
  if (!agent) return null;
  if (auth.role !== 'admin' && agent.tenant_id !== auth.tenantId) return null;
  return agent;
}

/** GET /agents/:id/snapshots - list snapshots for an agent */
snapshotRoutes.get('/agents/:id/snapshots', (c) => {
  const db = getDb();
  const auth = c.get('auth');
  const { id } = c.req.param();

  const agent = verifyAgentAccess(db, id, auth);
  if (!agent) {
    return c.json({ error: `Agent '${id}' not found` }, 404);
  }

  const snapshots = db
    .prepare(
      'SELECT id, agent_id, seq, label, created_at FROM agent_snapshots WHERE agent_id = ? ORDER BY seq DESC',
    )
    .all(id);

  return c.json({ snapshots });
});

const captureSnapshotSchema = z.object({
  label: z.string().max(100).optional(),
});

/** POST /agents/:id/snapshots - capture a snapshot */
snapshotRoutes.post(
  '/agents/:id/snapshots',
  zValidator('json', captureSnapshotSchema),
  async (c) => {
    const db = getDb();
    const auth = c.get('auth');
    const { id } = c.req.param();

    const agent = verifyAgentAccess(db, id, auth);
    if (!agent) {
      return c.json({ error: `Agent '${id}' not found` }, 404);
    }

    const { label } = c.req.valid('json');

    try {
      const result = await handleSnapshotRPC.capture({ agentId: id, label });
      return c.json(result, 201);
    } catch (err) {
      return c.json({ error: getErrorMessage(err) }, 502);
    }
  },
);

/** POST /agents/:id/snapshots/:seq/restore - restore a snapshot */
snapshotRoutes.post('/agents/:id/snapshots/:seq/restore', async (c) => {
  const db = getDb();
  const auth = c.get('auth');
  const { id, seq } = c.req.param();

  const agent = verifyAgentAccess(db, id, auth);
  if (!agent) {
    return c.json({ error: `Agent '${id}' not found` }, 404);
  }

  try {
    const result = await handleSnapshotRPC.restore({
      agentId: id,
      seq: parseInt(seq, 10),
    });
    return c.json(result);
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 502);
  }
});

/** GET /agents/:id/children - get child agents (spawn chain) */
snapshotRoutes.get('/agents/:id/children', (c) => {
  const db = getDb();
  const auth = c.get('auth');
  const { id } = c.req.param();

  const agent = verifyAgentAccess(db, id, auth);
  if (!agent) {
    return c.json({ error: `Agent '${id}' not found` }, 404);
  }

  let tenantFilter = '';
  const params: unknown[] = [id];

  if (auth.role !== 'admin') {
    tenantFilter = 'AND tenant_id = ?';
    params.push(auth.tenantId);
  }

  const children = db
    .prepare(
      `SELECT id, name, type, status, parent_id, spawn_depth, created_at FROM agents WHERE parent_id = ? AND status != 'destroyed' ${tenantFilter} ORDER BY created_at DESC`,
    )
    .all(...params);

  return c.json({ children });
});
