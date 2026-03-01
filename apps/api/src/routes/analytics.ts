/** Analytics routes — Metrics, anomalies, alert rules */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { handleAnalyticsRPC, handleSecurityRPC } from '../engine/engine.js';
import { getErrorMessage } from '@omniwatch/shared';
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

/** Schema: numeric :id path param */
const numericIdParam = z.object({
  id: z.coerce.number().int().min(1),
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
    try {
      const { agentId, period, limit } = c.req.valid('query');
      const metrics = handleAnalyticsRPC.metrics({ agentId, period, limit });
      return c.json(metrics);
    } catch (err) {
      return c.json({ error: getErrorMessage(err) }, 500);
    }
  },
);

/** GET /analytics/anomalies — Detected anomalies */
analyticsRoutes.get(
  '/analytics/anomalies',
  requireRole('admin', 'operator', 'viewer'),
  zValidator('query', anomaliesQuerySchema),
  async (c) => {
    try {
      const { agentId } = c.req.valid('query');
      const anomalies = handleAnalyticsRPC.anomalies({ agentId });
      return c.json(anomalies);
    } catch (err) {
      return c.json({ error: getErrorMessage(err) }, 500);
    }
  },
);

/** GET /analytics/alerts — List alert rules */
analyticsRoutes.get('/analytics/alerts', requireRole('admin', 'operator', 'viewer'), async (c) => {
  try {
    const auth = c.get('auth');
    const rules = handleAnalyticsRPC.alertRules({ tenantId: auth.tenantId });
    return c.json(rules);
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 500);
  }
});

/** POST /analytics/alerts — Create alert rule */
analyticsRoutes.post(
  '/analytics/alerts',
  requireRole('admin'),
  zValidator('json', createAlertSchema),
  async (c) => {
    try {
      const auth = c.get('auth');
      const body = c.req.valid('json');
      const rule = handleAnalyticsRPC.createAlert({ ...body, tenantId: auth.tenantId });
      return c.json({ rule }, 201);
    } catch (err) {
      return c.json({ error: getErrorMessage(err) }, 500);
    }
  },
);

/** PUT /analytics/alerts/:id — Update alert rule */
analyticsRoutes.put(
  '/analytics/alerts/:id',
  requireRole('admin'),
  zValidator('param', numericIdParam),
  zValidator('json', updateAlertSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const rule = handleAnalyticsRPC.updateAlert({ id, updates: body });
      return c.json(rule);
    } catch (err) {
      return c.json({ error: getErrorMessage(err) }, 500);
    }
  },
);

/** DELETE /analytics/alerts/:id — Delete alert rule */
analyticsRoutes.delete(
  '/analytics/alerts/:id',
  requireRole('admin'),
  zValidator('param', numericIdParam),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      handleAnalyticsRPC.deleteAlert({ id });
      return c.body(null, 204);
    } catch (err) {
      return c.json({ error: getErrorMessage(err) }, 500);
    }
  },
);

/** GET /security/events — Security audit log */
analyticsRoutes.get(
  '/security/events',
  requireRole('admin'),
  zValidator('query', securityEventsQuerySchema),
  async (c) => {
    try {
      const { agentId, limit } = c.req.valid('query');
      const events = handleSecurityRPC.events({ agentId, limit });
      return c.json(events);
    } catch (err) {
      return c.json({ error: getErrorMessage(err) }, 500);
    }
  },
);
