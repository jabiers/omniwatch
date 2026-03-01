/** Queue monitoring routes */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { handleQueueRPC } from '../engine/engine.js';
import { requireRole } from '../middleware/auth.js';
import { getErrorMessage } from '@omniwatch/shared';

/** Schema: GET /queue/dead-letters query params */
const deadLettersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export const queueRoutes = new Hono();

/** GET /queue/stats — Queue statistics */
queueRoutes.get('/queue/stats', requireRole('admin', 'operator', 'viewer'), async (c) => {
  try {
    const stats = handleQueueRPC.stats({});
    return c.json(stats);
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 500);
  }
});

/** GET /queue/dead-letters — Dead letter queue */
queueRoutes.get(
  '/queue/dead-letters',
  requireRole('admin', 'operator'),
  zValidator('query', deadLettersQuerySchema),
  async (c) => {
    try {
      const { limit } = c.req.valid('query');
      const letters = handleQueueRPC.deadLetters({ limit });
      return c.json(letters);
    } catch (err) {
      return c.json({ error: getErrorMessage(err) }, 500);
    }
  },
);

/** POST /queue/dead-letters/:id/retry — Retry a dead letter */
queueRoutes.post('/queue/dead-letters/:id/retry', requireRole('admin', 'operator'), async (c) => {
  try {
    const id = Number(c.req.param('id'));
    if (isNaN(id) || id < 1) {
      return c.json({ error: 'Invalid dead letter ID' }, 400);
    }
    const result = handleQueueRPC.retryDeadLetter({ id });
    return c.json(result);
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 500);
  }
});
