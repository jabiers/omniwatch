/** Analytics routes — Metrics, anomalies, alert rules */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { handleAnalyticsRPC, handleSecurityRPC } from '@omniwatch/daemon/engine';
import { requireRole } from '../middleware/auth.js';

/** Schema: GET /analytics/metrics query params */
const metricsQuerySchema = z.object({
  agentId: z.string().min(1, 'agentId required'),
  period: z.enum(['hourly', 'daily']).default('hourly'),
  limit: z.coerce.number().int().min(1).max(1000).default(24),
});

/** Schema: GET /analytics/anomalies query params */
const anomaliesQuerySchema = z.object({
  agentId: z.string().optional(),
});

/** Schema: POST /analytics/alerts request body */
const createAlertSchema = z.object({
  metric_name: z.string().min(1, 'metric_name is required'),
  operator: z.enum(['gt', 'lt', 'gte', 'lte']),
  threshold: z.number(),
  window_minutes: z.number().int().min(1).default(60),
  notify_channels: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
});

/** Schema: PUT /analytics/alerts/:id request body */
const updateAlertSchema = z.object({
  metric_name: z.string().min(1).optional(),
  operator: z.enum(['gt', 'lt', 'gte', 'lte']).optional(),
  threshold: z.number().optional(),
  window_minutes: z.number().int().min(1).optional(),
  notify_channels: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

/** Schema: GET /security/events query params */
const securityEventsQuerySchema = z.object({
  agentId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export const analyticsRoutes = new Hono();

/** GET /analytics/metrics?agentId=&period= — Agent metrics */
analyticsRoutes.get(
  '/analytics/metrics',
  requireRole('admin', 'operator', 'viewer'),
  zValidator('query', metricsQuerySchema),
  async (c) => {
    const { agentId, period, limit } = c.req.valid('query');
    const metrics = handleAnalyticsRPC.metrics({ agentId, period, limit });
    return c.json(metrics);
  },
);

/** GET /analytics/anomalies — Detected anomalies */
analyticsRoutes.get(
  '/analytics/anomalies',
  requireRole('admin', 'operator', 'viewer'),
  zValidator('query', anomaliesQuerySchema),
  async (c) => {
    const { agentId } = c.req.valid('query');
    const anomalies = handleAnalyticsRPC.anomalies({ agentId });
    return c.json(anomalies);
  },
);

/** GET /analytics/alerts — List alert rules */
analyticsRoutes.get('/analytics/alerts', requireRole('admin', 'operator', 'viewer'), async (c) => {
  const auth = c.get('auth');
  const rules = handleAnalyticsRPC.alertRules({ tenantId: auth.tenantId });
  return c.json(rules);
});

/** POST /analytics/alerts — Create alert rule */
analyticsRoutes.post(
  '/analytics/alerts',
  requireRole('admin'),
  zValidator('json', createAlertSchema),
  async (c) => {
    const auth = c.get('auth');
    const body = c.req.valid('json');
    const rule = handleAnalyticsRPC.createAlert({ ...body, tenantId: auth.tenantId });
    return c.json(rule, 201);
  },
);

/** PUT /analytics/alerts/:id — Update alert rule */
analyticsRoutes.put(
  '/analytics/alerts/:id',
  requireRole('admin'),
  zValidator('json', updateAlertSchema),
  async (c) => {
    const id = Number(c.req.param('id'));
    const body = c.req.valid('json');
    const rule = handleAnalyticsRPC.updateAlert({ id, updates: body });
    return c.json(rule);
  },
);

/** DELETE /analytics/alerts/:id — Delete alert rule */
analyticsRoutes.delete('/analytics/alerts/:id', requireRole('admin'), async (c) => {
  const id = Number(c.req.param('id'));
  const result = handleAnalyticsRPC.deleteAlert({ id });
  return c.json(result);
});

/** GET /security/events — Security audit log */
analyticsRoutes.get(
  '/security/events',
  requireRole('admin'),
  zValidator('query', securityEventsQuerySchema),
  async (c) => {
    const { agentId, limit } = c.req.valid('query');
    const events = handleSecurityRPC.events({ agentId, limit });
    return c.json(events);
  },
);
