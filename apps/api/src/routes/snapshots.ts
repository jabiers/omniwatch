/** Snapshot (Time Travel) API routes */
import { Hono } from 'hono';
import { getDb } from '@vigil/db';
import { rpcCall } from '../lib/rpc-bridge.js';

export const snapshotRoutes = new Hono();

/** GET /agents/:id/snapshots - list snapshots for an agent */
snapshotRoutes.get('/agents/:id/snapshots', (c) => {
  const db = getDb();
  const { id } = c.req.param();

  const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(id);
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

/** POST /agents/:id/snapshots - capture a snapshot */
snapshotRoutes.post('/agents/:id/snapshots', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<{ label?: string }>().catch(() => ({ label: undefined }));

  try {
    const result = await rpcCall('snapshot.capture', {
      agentId: id,
      label: body.label,
    });
    return c.json(result, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 502);
  }
});

/** POST /agents/:id/snapshots/:seq/restore - restore a snapshot */
snapshotRoutes.post('/agents/:id/snapshots/:seq/restore', async (c) => {
  const { id, seq } = c.req.param();

  try {
    const result = await rpcCall('snapshot.restore', {
      agentId: id,
      seq: parseInt(seq, 10),
    });
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 502);
  }
});

/** GET /agents/:id/children - get child agents (spawn chain) */
snapshotRoutes.get('/agents/:id/children', (c) => {
  const db = getDb();
  const { id } = c.req.param();

  const children = db
    .prepare(
      "SELECT * FROM agents WHERE parent_id = ? AND status != 'destroyed' ORDER BY created_at DESC",
    )
    .all(id);

  return c.json({ children });
});
