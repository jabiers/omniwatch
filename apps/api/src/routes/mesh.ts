/** Mesh topology and events API routes */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '@omniwatch/db';
import { handleMeshRPC } from '../engine/engine.js';
import { getErrorMessage } from '@omniwatch/shared';

const meshEventsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
  topic: z.string().max(200).optional(),
});

export const meshRoutes = new Hono();

/** GET /mesh/topology - get mesh node graph */
meshRoutes.get('/mesh/topology', async (c) => {
  try {
    const result = await handleMeshRPC.topology({});
    return c.json(result);
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 502);
  }
});

/** GET /mesh/events - get recent mesh events */
meshRoutes.get('/mesh/events', zValidator('query', meshEventsSchema), (c) => {
  const db = getDb();
  const auth = c.get('auth');
  const { limit, topic } = c.req.valid('query');

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (auth.role !== 'admin') {
    conditions.push('a.tenant_id = ?');
    params.push(auth.tenantId);
  }

  if (topic) {
    conditions.push('e.topic = ?');
    params.push(topic);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT e.id, e.publisher_id, e.topic, e.payload, e.created_at FROM mesh_events e JOIN agents a ON e.publisher_id = a.id ${where} ORDER BY e.created_at DESC LIMIT ?`;
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
