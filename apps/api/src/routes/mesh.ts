/** Mesh topology and events API routes */
import { Hono } from 'hono';
import { getDb } from '@omniwatch/db';
import { rpcCall } from '../lib/rpc-bridge.js';

export const meshRoutes = new Hono();

/** GET /mesh/topology - get mesh node graph */
meshRoutes.get('/mesh/topology', async (c) => {
  try {
    const result = await rpcCall('mesh.topology');
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 502);
  }
});

/** GET /mesh/events - get recent mesh events */
meshRoutes.get('/mesh/events', (c) => {
  const db = getDb();
  const auth = c.get('auth');
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 500);
  const topic = c.req.query('topic');

  const conditions: string[] = [];
  const params: unknown[] = [];

  // Tenant isolation: non-admin users see only their tenant's events
  if (auth.role !== 'admin') {
    conditions.push('a.tenant_id = ?');
    params.push(auth.tenantId);
  }

  if (topic) {
    conditions.push('e.topic = ?');
    params.push(topic);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT e.* FROM mesh_events e JOIN agents a ON e.publisher_id = a.id ${where} ORDER BY e.created_at DESC LIMIT ?`;
  params.push(limit);

  const events = db.prepare(sql).all(...params);

  return c.json({ events });
});

/** GET /mesh/subscriptions - get all active subscriptions */
meshRoutes.get('/mesh/subscriptions', (c) => {
  const db = getDb();
  const auth = c.get('auth');

  let tenantFilter = '';
  const params: unknown[] = [];

  if (auth.role !== 'admin') {
    tenantFilter = 'AND a.tenant_id = ?';
    params.push(auth.tenantId);
  }

  const subs = db
    .prepare(
      `
    SELECT s.agent_id, s.topic, a.name as agent_name
    FROM mesh_subscriptions s
    JOIN agents a ON s.agent_id = a.id
    WHERE a.status != 'destroyed' ${tenantFilter}
    ORDER BY s.topic
  `,
    )
    .all(...params);

  return c.json({ subscriptions: subs });
});
