import { Hono } from 'hono';
import { getDb } from '@omniwatch/db';
import type { Notification } from '@omniwatch/shared';

export const notificationRoutes = new Hono();

/** GET /notifications - list notifications with optional filters */
notificationRoutes.get('/notifications', (c) => {
  const db = getDb();
  const auth = c.get('auth');
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 500);
  const severity = c.req.query('severity');
  const agentId = c.req.query('agent_id');

  const conditions: string[] = [];
  const params: unknown[] = [];

  // Tenant isolation: non-admin users see only their tenant's notifications
  if (auth.role !== 'admin') {
    conditions.push('a.tenant_id = ?');
    params.push(auth.tenantId);
  }

  if (severity) {
    conditions.push('n.severity = ?');
    params.push(severity);
  }

  if (agentId) {
    conditions.push('n.agent_id = ?');
    params.push(agentId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT n.* FROM notifications n JOIN agents a ON n.agent_id = a.id ${where} ORDER BY n.created_at DESC LIMIT ?`;
  params.push(limit);

  const notifications = db.prepare(sql).all(...params) as Notification[];

  return c.json({ notifications });
});
