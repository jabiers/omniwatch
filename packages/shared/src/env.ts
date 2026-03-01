/**
 * Environment configuration with Zod validation.
 * Provides typed access to environment variables with sensible defaults.
 */
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  VIGIL_DATA_DIR: z.string().default(''),
  PORT: z.coerce.number().default(3456),
  CORS_ORIGINS: z.string().default('http://localhost:3457'),
  OMNI_API_KEY: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_REDIRECT_URI: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OLLAMA_URL: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().optional(),
  DISCORD_WEBHOOK_URL: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let _validated: EnvConfig | null = null;

/**
 * Get validated environment config (singleton).
 * Returns a typed object with defaults applied.
 */
export function getEnvConfig(): EnvConfig {
  if (!_validated) {
    _validated = envSchema.parse(process.env);
  }
  return _validated;
}

/**
 * Validate environment variables at startup.
 * Logs warnings for missing optional AI provider keys.
 */
export function validateEnv(): void {
  _validated = envSchema.parse(process.env);

  // Log optional AI keys status
  const optionalKeys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'OLLAMA_URL'] as const;
  const missing = optionalKeys.filter((k) => !_validated![k]);
  if (missing.length > 0) {
    console.warn(`[vigil] Missing optional env vars: ${missing.join(', ')}`);
  }
}
