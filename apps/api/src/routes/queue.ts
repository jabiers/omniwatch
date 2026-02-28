/** Queue monitoring routes */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { rpcCall, isDaemonRunning } from '../lib/rpc-bridge.js';
import { requireRole } from '../middleware/auth.js';

/** Schema: GET /queue/dead-letters query params */
const deadLettersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export const queueRoutes = new Hono();

/** GET /queue/stats — Queue statistics */
queueRoutes.get('/queue/stats', requireRole('admin', 'operator', 'viewer'), async (c) => {
  if (!isDaemonRunning()) return c.json({ error: 'Daemon not running' }, 503);
  const stats = await rpcCall('queue.stats', {});
  return c.json(stats);
});

/** GET /queue/dead-letters — Dead letter queue */
queueRoutes.get('/queue/dead-letters', requireRole('admin', 'operator'), zValidator('query', deadLettersQuerySchema), async (c) => {
  if (!isDaemonRunning()) return c.json({ error: 'Daemon not running' }, 503);
  const { limit } = c.req.valid('query');
  const letters = await rpcCall('queue.deadLetters', { limit });
  return c.json(letters);
});

/** POST /queue/dead-letters/:id/retry — Retry a dead letter */
queueRoutes.post('/queue/dead-letters/:id/retry', requireRole('admin', 'operator'), async (c) => {
  if (!isDaemonRunning()) return c.json({ error: 'Daemon not running' }, 503);
  const id = Number(c.req.param('id'));
  const result = await rpcCall('queue.retryDeadLetter', { id });
  return c.json(result);
});
