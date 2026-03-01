/**
 * Environment configuration helper.
 * Provides typed access to environment variables with sensible defaults.
 */
export function getEnvConfig() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    isDev: process.env.NODE_ENV !== 'production',
    isProd: process.env.NODE_ENV === 'production',
    dataDir: process.env.OMNI_DATA_DIR || '',
    port: parseInt(process.env.PORT || '3456'),
  };
}

/** Optional but important environment variables (missing ones are logged as warnings) */
const OPTIONAL_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'OLLAMA_URL',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'GITHUB_REDIRECT_URI',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'SLACK_WEBHOOK_URL',
  'DISCORD_WEBHOOK_URL',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
] as const;

/**
 * Validate environment variables at startup.
 * OMNI_DATA_DIR has a sensible default (~/.omniwatch), so nothing is strictly required.
 * Logs warnings for missing optional vars.
 */
export function validateEnv(): void {
  const missingOptional: string[] = [];

  for (const key of OPTIONAL_ENV_VARS) {
    if (!process.env[key]) {
      missingOptional.push(key);
    }
  }

  if (missingOptional.length > 0) {
    // Log at warn level — non-fatal, just informational
    console.warn(
      `[omniwatch] Missing optional env vars: ${missingOptional.join(', ')}`
    );
  }
}
