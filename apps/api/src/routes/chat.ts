import { Hono } from 'hono';
import { rpcCall } from '../lib/rpc-bridge.js';

export const chatRoutes = new Hono();

/** POST /agents/:id/chat - send chat message to modify agent */
chatRoutes.post('/agents/:id/chat', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<{ message: string }>();

  if (!body.message) {
    return c.json({ error: 'message is required' }, 400);
  }

  try {
    const result = await rpcCall('agent.chat', { id, message: body.message });
    return c.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 502);
  }
});

/** POST /agents/preview - preview agent code without creating */
chatRoutes.post('/agents/preview', async (c) => {
  const body = await c.req.json<{ prompt: string; template?: string }>();

  if (!body.prompt) {
    return c.json({ error: 'prompt is required' }, 400);
  }

  try {
    const result = await rpcCall('agent.preview', {
      prompt: body.prompt,
      template: body.template,
    });
    return c.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 502);
  }
});

/** POST /agents/:id/apply - apply code change to agent */
chatRoutes.post('/agents/:id/apply', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<{ code: string }>();

  if (!body.code) {
    return c.json({ error: 'code is required' }, 400);
  }

  try {
    const result = await rpcCall('agent.apply', { id, code: body.code });
    return c.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 502);
  }
});
