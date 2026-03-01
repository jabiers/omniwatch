/** Mesh topology and events API routes */
import { Hono } from 'hono';
import { getDb } from '@vigil/db';
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
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 500);
  const topic = c.req.query('topic');

  let events;
  if (topic) {
    events = db
      .prepare('SELECT * FROM mesh_events WHERE topic = ? ORDER BY created_at DESC LIMIT ?')
      .all(topic, limit);
  } else {
    events = db.prepare('SELECT * FROM mesh_events ORDER BY created_at DESC LIMIT ?').all(limit);
  }

  return c.json({ events });
});

/** GET /mesh/subscriptions - get all active subscriptions */
meshRoutes.get('/mesh/subscriptions', (c) => {
  const db = getDb();
  const subs = db
    .prepare(
      `
    SELECT s.agent_id, s.topic, a.name as agent_name
    FROM mesh_subscriptions s
    JOIN agents a ON s.agent_id = a.id
    WHERE a.status != 'destroyed'
    ORDER BY s.topic
  `,
    )
    .all();

  return c.json({ subscriptions: subs });
});
