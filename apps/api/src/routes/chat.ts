import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { handleChatRPC } from '@omniwatch/daemon/engine';
import { getErrorMessage } from '@omniwatch/shared';

const chatSchema = z.object({ message: z.string().min(1, 'message is required').max(5000) });
const previewSchema = z.object({
  prompt: z.string().min(1, 'prompt is required').max(5000),
  template: z.string().optional(),
});
const applySchema = z.object({ code: z.string().min(1, 'code is required') });

export const chatRoutes = new Hono();

/** POST /agents/:id/chat - send chat message to modify agent */
chatRoutes.post('/agents/:id/chat', zValidator('json', chatSchema), async (c) => {
  const { id } = c.req.param();
  const { message } = c.req.valid('json');

  try {
    const result = await handleChatRPC.chat({ id, message });
    return c.json({ result });
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 502);
  }
});

/** POST /agents/preview - preview agent code without creating */
chatRoutes.post('/agents/preview', zValidator('json', previewSchema), async (c) => {
  const { prompt, template } = c.req.valid('json');

  try {
    const result = await handleChatRPC.preview({ prompt, template });
    return c.json({ result });
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 502);
  }
});

/** POST /agents/:id/apply - apply code change to agent */
chatRoutes.post('/agents/:id/apply', zValidator('json', applySchema), async (c) => {
  const { id } = c.req.param();
  const { code } = c.req.valid('json');

  try {
    const result = await handleChatRPC.apply({ id, code });
    return c.json({ result });
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 502);
  }
});
