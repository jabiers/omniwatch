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

const chatQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

/** GET /agents/:id/chat - get chat history */
chatRoutes.get(
  '/agents/:id/chat',
  zValidator('param', agentIdParam),
  zValidator('query', chatQuerySchema),
  (c) => {
    const { id } = c.req.valid('param');
    const auth = c.get('auth');
    if (!verifyAgentAccess(id, auth)) {
      return c.json({ error: `Agent '${id}' not found` }, 404);
    }

    const db = getDb();
    const { limit } = c.req.valid('query');
    const messages = db
      .prepare(
        'SELECT id, role, content, modified_code, auto_applied, created_at FROM agent_chat_messages WHERE agent_id = ? AND tenant_id = ? ORDER BY created_at ASC LIMIT ?',
      )
      .all(id, auth.tenantId, limit);

    return c.json({ messages });
  },
);

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
    const db = getDb();

    try {
      const result = await handleChatRPC.chat({ id, message });

      // Save both user message and assistant response atomically
      db.transaction(() => {
        db.prepare(
          'INSERT INTO agent_chat_messages (agent_id, tenant_id, role, content) VALUES (?, ?, ?, ?)',
        ).run(id, auth.tenantId, 'user', message);
        db.prepare(
          'INSERT INTO agent_chat_messages (agent_id, tenant_id, role, content, modified_code, auto_applied) VALUES (?, ?, ?, ?, ?, ?)',
        ).run(
          id,
          auth.tenantId,
          'assistant',
          result.message || '',
          result.modifiedCode || null,
          result.autoApplied ? 1 : 0,
        );
      })();

      return c.json({ result });
    } catch (err) {
      return c.json({ error: getErrorMessage(err) }, 502);
    }
  },
);

/** DELETE /agents/:id/chat - clear chat history */
chatRoutes.delete(
  '/agents/:id/chat',
  requireRole('admin', 'operator'),
  zValidator('param', agentIdParam),
  (c) => {
    const { id } = c.req.valid('param');
    const auth = c.get('auth');
    if (!verifyAgentAccess(id, auth)) {
      return c.json({ error: `Agent '${id}' not found` }, 404);
    }

    const db = getDb();
    db.prepare('DELETE FROM agent_chat_messages WHERE agent_id = ? AND tenant_id = ?').run(
      id,
      auth.tenantId,
    );

    return c.body(null, 204);
  },
);

/** POST /agents/:id/chat/summarize - summarize and compact chat history */
chatRoutes.post(
  '/agents/:id/chat/summarize',
  requireRole('admin', 'operator'),
  zValidator('param', agentIdParam),
  async (c) => {
    const { id } = c.req.valid('param');
    const auth = c.get('auth');
    if (!verifyAgentAccess(id, auth)) {
      return c.json({ error: `Agent '${id}' not found` }, 404);
    }

    const db = getDb();
    const messages = db
      .prepare(
        'SELECT role, content FROM agent_chat_messages WHERE agent_id = ? AND tenant_id = ? ORDER BY created_at ASC',
      )
      .all(id, auth.tenantId) as { role: string; content: string }[];

    if (messages.length < 4) {
      return c.json({ error: 'Not enough messages to summarize' }, 400);
    }

    // Build summary from messages
    const summaryText = `[Chat Summary] ${messages.length} messages exchanged. Key topics: ${messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content.slice(0, 60))
      .join('; ')}`;

    // Replace all messages with single summary
    db.transaction(() => {
      db.prepare('DELETE FROM agent_chat_messages WHERE agent_id = ? AND tenant_id = ?').run(
        id,
        auth.tenantId,
      );
      db.prepare(
        'INSERT INTO agent_chat_messages (agent_id, tenant_id, role, content) VALUES (?, ?, ?, ?)',
      ).run(id, auth.tenantId, 'system', summaryText);
    })();

    return c.json({ summary: summaryText, originalCount: messages.length });
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
