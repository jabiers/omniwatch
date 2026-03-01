import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { loadConfig, saveConfig, type OmniConfig } from '@omniwatch/db';

/** Blocklist for SSRF prevention — reject internal/private network URLs */
const SSRF_BLOCKED_HOSTS = [
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^localhost$/i,
  /^\[::1?\]$/,
  /^169\.254\.\d+\.\d+$/, // link-local
];

/** Validate webhook URL: must be https and not targeting internal networks */
function validateWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname;
    return !SSRF_BLOCKED_HOSTS.some((re) => re.test(hostname));
  } catch {
    return false;
  }
}

/** Zod refinement for webhook URLs */
const webhookUrlSchema = z
  .string()
  .optional()
  .refine((val) => !val || validateWebhookUrl(val), {
    message: 'Webhook URL must be HTTPS and not target internal networks',
  });

const updateConfigSchema = z.object({
  config: z.object({
    ai: z
      .object({
        model: z.string().optional(),
        api_key: z.string().optional(),
        ollama_url: z.string().optional(),
      })
      .optional(),
    notification: z
      .object({
        slack_webhook: webhookUrlSchema,
        discord_webhook: webhookUrlSchema,
        webhook_url: webhookUrlSchema,
        telegram_token: z.string().optional(),
        telegram_chat_id: z.string().optional(),
        system: z.boolean().optional(),
        channels: z.record(z.boolean()).optional(),
      })
      .optional(),
    agent: z
      .object({
        max_count: z.number().int().positive().optional(),
        memory_limit_mb: z.number().int().positive().optional(),
        max_heal_attempts: z.number().int().nonnegative().optional(),
      })
      .optional(),
  }),
});

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
      slack_webhook: config.notification.slack_webhook
        ? '••••' + config.notification.slack_webhook.slice(-12)
        : '',
      discord_webhook: config.notification.discord_webhook
        ? '••••' + config.notification.discord_webhook.slice(-12)
        : '',
      webhook_url: config.notification.webhook_url
        ? '••••' + config.notification.webhook_url.slice(-12)
        : '',
      telegram_token: config.notification.telegram_token
        ? '••••' + config.notification.telegram_token.slice(-6)
        : '',
    },
  };

  return c.json({ config: masked });
});

/** PUT /config - update config fields */
configRoutes.put('/config', zValidator('json', updateConfigSchema), async (c) => {
  const { config: updates } = c.req.valid('json');
  const current = loadConfig();

  // Merge AI settings (skip masked api_key)
  if (updates.ai) {
    if (updates.ai.model) current.ai.model = updates.ai.model;
    if (updates.ai.api_key && !updates.ai.api_key.startsWith('••••')) {
      current.ai.api_key = updates.ai.api_key;
    }
    if (updates.ai.ollama_url !== undefined) current.ai.ollama_url = updates.ai.ollama_url;
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
    if (n.telegram_chat_id !== undefined)
      current.notification.telegram_chat_id = n.telegram_chat_id;
    if (n.system !== undefined) current.notification.system = n.system;
    if (n.channels)
      current.notification.channels = { ...current.notification.channels, ...n.channels };
  }

  // Merge agent settings
  if (updates.agent) {
    if (updates.agent.max_count !== undefined) current.agent.max_count = updates.agent.max_count;
    if (updates.agent.memory_limit_mb !== undefined)
      current.agent.memory_limit_mb = updates.agent.memory_limit_mb;
    if (updates.agent.max_heal_attempts !== undefined)
      current.agent.max_heal_attempts = updates.agent.max_heal_attempts;
  }

  saveConfig(current);
  return c.json({ success: true });
});
