import { Hono } from 'hono';
import { getUsageSummary } from '@omniwatch/db';

export const usageRoutes = new Hono();

/** GET /usage - AI usage summary with cost tracking */
usageRoutes.get('/usage', (c) => {
  const days = Number(c.req.query('days') || '30');
  const summary = getUsageSummary(Math.min(days, 365));
  return c.json(summary);
});
