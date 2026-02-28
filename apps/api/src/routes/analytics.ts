/** Analytics routes — Metrics, anomalies, alert rules */
import { Hono } from 'hono';
import { rpcCall, isDaemonRunning } from '../lib/rpc-bridge.js';
import { requireRole } from '../middleware/auth.js';

export const analyticsRoutes = new Hono();

/** GET /analytics/metrics?agentId=&period= — Agent metrics */
analyticsRoutes.get('/analytics/metrics', requireRole('admin', 'operator', 'viewer'), async (c) => {
  if (!isDaemonRunning()) return c.json({ error: 'Daemon not running' }, 503);
  const agentId = c.req.query('agentId');
  const period = c.req.query('period') || 'hourly';
  const limit = Number(c.req.query('limit') || 24);
  if (!agentId) return c.json({ error: 'agentId required' }, 400);
  const metrics = await rpcCall('analytics.metrics', { agentId, period, limit });
  return c.json(metrics);
});

/** GET /analytics/anomalies — Detected anomalies */
analyticsRoutes.get('/analytics/anomalies', requireRole('admin', 'operator', 'viewer'), async (c) => {
  if (!isDaemonRunning()) return c.json({ error: 'Daemon not running' }, 503);
  const agentId = c.req.query('agentId');
  const anomalies = await rpcCall('analytics.anomalies', { agentId });
  return c.json(anomalies);
});

/** GET /analytics/alerts — List alert rules */
analyticsRoutes.get('/analytics/alerts', requireRole('admin', 'operator', 'viewer'), async (c) => {
  if (!isDaemonRunning()) return c.json({ error: 'Daemon not running' }, 503);
  const auth = c.get('auth');
  const rules = await rpcCall('analytics.alertRules', { tenantId: auth.tenantId });
  return c.json(rules);
});

/** POST /analytics/alerts — Create alert rule */
analyticsRoutes.post('/analytics/alerts', requireRole('admin'), async (c) => {
  if (!isDaemonRunning()) return c.json({ error: 'Daemon not running' }, 503);
  const auth = c.get('auth');
  const body = await c.req.json().catch(() => ({}));
  const rule = await rpcCall('analytics.createAlert', { ...body, tenantId: auth.tenantId });
  return c.json(rule, 201);
});

/** PUT /analytics/alerts/:id — Update alert rule */
analyticsRoutes.put('/analytics/alerts/:id', requireRole('admin'), async (c) => {
  if (!isDaemonRunning()) return c.json({ error: 'Daemon not running' }, 503);
  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => ({}));
  const rule = await rpcCall('analytics.updateAlert', { id, updates: body });
  return c.json(rule);
});

/** DELETE /analytics/alerts/:id — Delete alert rule */
analyticsRoutes.delete('/analytics/alerts/:id', requireRole('admin'), async (c) => {
  if (!isDaemonRunning()) return c.json({ error: 'Daemon not running' }, 503);
  const id = Number(c.req.param('id'));
  const result = await rpcCall('analytics.deleteAlert', { id });
  return c.json(result);
});

/** GET /security/events — Security audit log */
analyticsRoutes.get('/security/events', requireRole('admin'), async (c) => {
  if (!isDaemonRunning()) return c.json({ error: 'Daemon not running' }, 503);
  const agentId = c.req.query('agentId');
  const limit = Number(c.req.query('limit') || 50);
  const events = await rpcCall('security.events', { agentId, limit });
  return c.json(events);
});
