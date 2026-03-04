import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '@omniwatch/db';
import { getErrorMessage } from '@omniwatch/shared';
import type { Notification } from '@omniwatch/shared';
import { requireRole } from '../middleware/auth.js';
import { dispatchNotification } from '../engine/notification-channels/registry.js';

const listNotificationsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  agent_id: z.string().optional(),
});

export const notificationRoutes = new Hono();

/** GET /notifications - list notifications with optional filters */
notificationRoutes.get('/notifications', zValidator('query', listNotificationsSchema), (c) => {
  try {
    const db = getDb();
    const auth = c.get('auth');
    const { limit, offset, severity, agent_id: agentId } = c.req.valid('query');

    const conditions: string[] = [];
    const params: unknown[] = [];

    // Tenant isolation: non-admin see own tenant + system notifications (agent_id IS NULL)
    if (auth.role !== 'admin') {
      conditions.push('(a.tenant_id = ? OR n.agent_id IS NULL)');
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
    const sql = `SELECT n.id, n.agent_id, n.channel, n.title, n.message, n.severity, n.status, n.created_at FROM notifications n LEFT JOIN agents a ON n.agent_id = a.id ${where} ORDER BY n.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const notifications = db.prepare(sql).all(...params) as Notification[];

    return c.json({ notifications });
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 500);
  }
});

/** POST /notifications/test - send test notification to all configured channels (admin only) */
notificationRoutes.post('/notifications/test', requireRole('admin'), async (c) => {
  try {
    await dispatchNotification({
      agentId: 'system',
      title: 'Test Notification',
      message:
        'This is a test notification from OmniWatch. If you see this, your notification channels are working correctly.',
      severity: 'info',
    });
    return c.json({ success: true, message: 'Test notification sent to all configured channels' });
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 500);
  }
});

/** DELETE /notifications/:id - delete a notification (admin only) */
notificationRoutes.delete('/notifications/:id', requireRole('admin'), (c) => {
  try {
    const db = getDb();
    const { id } = c.req.param();
    db.prepare('DELETE FROM notifications WHERE id = ?').run(id);
    return c.body(null, 204);
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 500);
  }
});
