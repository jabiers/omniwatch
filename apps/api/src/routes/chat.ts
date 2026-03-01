import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '@omniwatch/db';
import { handleChatRPC } from '../engine/engine.js';
import { getErrorMessage } from '@omniwatch/shared';
import { requireRole } from '../middleware/auth.js';

const agentIdParam = z.object({ id: z.string().min(1, 'Agent ID is required') });
const chatSchema = z.object({ message: z.string().min(1, 'message is required').max(5000) });
const previewSchema = z.object({
  prompt: z.string().min(1, 'prompt is required').max(5000),
  template: z.string().optional(),
});
const applySchema = z.object({ code: z.string().min(1, 'code is required') });

export const chatRoutes = new Hono();

/** Verify agent exists and belongs to user's tenant */
function verifyAgentAccess(agentId: string, auth: { tenantId: string; role: string }): boolean {
  const db = getDb();
  const agent = db.prepare('SELECT id, tenant_id FROM agents WHERE id = ?').get(agentId) as {
    id: string;
    tenant_id: string;
  } | null;
  if (!agent) return false;
  if (auth.role !== 'admin' && agent.tenant_id !== auth.tenantId) return false;
  return true;
}

/** POST /agents/:id/chat - send chat message to modify agent */
chatRoutes.post(
  '/agents/:id/chat',
  requireRole('admin', 'operator'),
  zValidator('param', agentIdParam),
  zValidator('json', chatSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const auth = c.get('auth');
    if (!verifyAgentAccess(id, auth)) {
      return c.json({ error: `Agent '${id}' not found` }, 404);
    }

    const { message } = c.req.valid('json');
    try {
      const result = await handleChatRPC.chat({ id, message });
      return c.json({ result });
    } catch (err) {
      return c.json({ error: getErrorMessage(err) }, 502);
    }
  },
);

/** POST /agents/preview - preview agent code without creating */
chatRoutes.post(
  '/agents/preview',
  requireRole('admin', 'operator'),
  zValidator('json', previewSchema),
  async (c) => {
    const { prompt, template } = c.req.valid('json');

    try {
      const result = await handleChatRPC.preview({ prompt, template });
      return c.json({ result });
    } catch (err) {
      return c.json({ error: getErrorMessage(err) }, 502);
    }
  },
);

/** POST /agents/:id/apply - apply code change to agent */
chatRoutes.post(
  '/agents/:id/apply',
  requireRole('admin', 'operator'),
  zValidator('param', agentIdParam),
  zValidator('json', applySchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const auth = c.get('auth');
    if (!verifyAgentAccess(id, auth)) {
      return c.json({ error: `Agent '${id}' not found` }, 404);
    }

    const { code } = c.req.valid('json');
    try {
      const result = await handleChatRPC.apply({ id, code });
      return c.json({ result });
    } catch (err) {
      return c.json({ error: getErrorMessage(err) }, 502);
    }
  },
);
