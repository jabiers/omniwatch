import { Hono } from 'hono';
import { getDb } from '@vigil/db';
import type { Notification } from '@vigil/shared';

export const notificationRoutes = new Hono();

/** GET /notifications - list notifications with optional filters */
notificationRoutes.get('/notifications', (c) => {
  const db = getDb();
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 500);
  const severity = c.req.query('severity');
  const agentId = c.req.query('agent_id');

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (severity) {
    conditions.push('severity = ?');
    params.push(severity);
  }

  if (agentId) {
    conditions.push('agent_id = ?');
    params.push(agentId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);

  const notifications = db.prepare(sql).all(...params) as Notification[];

  return c.json({ notifications });
});
