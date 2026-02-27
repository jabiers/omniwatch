import { Hono } from 'hono';
import { loadConfig, saveConfig, type OmniConfig } from '@omniwatch/db';

export const configRoutes = new Hono();

/** GET /config - return full config (mask sensitive fields) */
configRoutes.get('/config', (c) => {
  const config = loadConfig();

  // Mask sensitive values for the frontend
  const masked: OmniConfig = {
    ...config,
    ai: {
      ...config.ai,
      api_key: config.ai.api_key ? '••••' + config.ai.api_key.slice(-8) : '',
    },
    notification: {
      ...config.notification,
      telegram_token: config.notification.telegram_token
        ? '••••' + config.notification.telegram_token.slice(-6)
        : '',
    },
  };

  return c.json({ config: masked });
});

/** PUT /config - update config fields */
configRoutes.put('/config', async (c) => {
  const body = await c.req.json<{ config: Partial<OmniConfig> }>();

  if (!body.config) {
    return c.json({ error: 'config object is required' }, 400);
  }

  const current = loadConfig();
  const updates = body.config;

  // Merge AI settings (skip masked api_key)
  if (updates.ai) {
    if (updates.ai.model) current.ai.model = updates.ai.model;
    if (updates.ai.api_key && !updates.ai.api_key.startsWith('••••')) {
      current.ai.api_key = updates.ai.api_key;
    }
  }

  // Merge notification settings
  if (updates.notification) {
    const n = updates.notification;
    if (n.slack_webhook !== undefined) current.notification.slack_webhook = n.slack_webhook;
    if (n.discord_webhook !== undefined) current.notification.discord_webhook = n.discord_webhook;
    if (n.webhook_url !== undefined) current.notification.webhook_url = n.webhook_url;
    if (n.telegram_token !== undefined && !n.telegram_token.startsWith('••••')) {
      current.notification.telegram_token = n.telegram_token;
    }
    if (n.telegram_chat_id !== undefined) current.notification.telegram_chat_id = n.telegram_chat_id;
    if (n.system !== undefined) current.notification.system = n.system;
    if (n.channels) current.notification.channels = { ...current.notification.channels, ...n.channels };
  }

  // Merge agent settings
  if (updates.agent) {
    if (updates.agent.max_count !== undefined) current.agent.max_count = updates.agent.max_count;
    if (updates.agent.memory_limit_mb !== undefined) current.agent.memory_limit_mb = updates.agent.memory_limit_mb;
    if (updates.agent.max_heal_attempts !== undefined) current.agent.max_heal_attempts = updates.agent.max_heal_attempts;
  }

  saveConfig(current);
  return c.json({ success: true });
});
