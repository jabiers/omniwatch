import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '@omniwatch/db';
import type { Notification } from '@omniwatch/shared';

const listNotificationsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  agent_id: z.string().optional(),
});

export const notificationRoutes = new Hono();

/** GET /notifications - list notifications with optional filters */
notificationRoutes.get('/notifications', zValidator('query', listNotificationsSchema), (c) => {
  const db = getDb();
  const auth = c.get('auth');
  const { limit, offset, severity, agent_id: agentId } = c.req.valid('query');

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
  const sql = `SELECT n.id, n.agent_id, n.channel, n.title, n.message, n.severity, n.created_at FROM notifications n JOIN agents a ON n.agent_id = a.id ${where} ORDER BY n.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const notifications = db.prepare(sql).all(...params) as Notification[];

  return c.json({ notifications });
});
