/** Queue monitoring routes */
import { Hono } from 'hono';
import { rpcCall, isDaemonRunning } from '../lib/rpc-bridge.js';
import { requireRole } from '../middleware/auth.js';

export const queueRoutes = new Hono();

/** GET /queue/stats — Queue statistics */
queueRoutes.get('/queue/stats', requireRole('admin', 'operator', 'viewer'), async (c) => {
  if (!isDaemonRunning()) return c.json({ error: 'Daemon not running' }, 503);
  const stats = await rpcCall('queue.stats', {});
  return c.json(stats);
});

/** GET /queue/dead-letters — Dead letter queue */
queueRoutes.get('/queue/dead-letters', requireRole('admin', 'operator'), async (c) => {
  if (!isDaemonRunning()) return c.json({ error: 'Daemon not running' }, 503);
  const limit = Number(c.req.query('limit') || 50);
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
