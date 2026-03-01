// Types
export type {
  AgentType,
  AgentStatus,
  Agent,
  AgentConfig,
  AgentLog,
  Notification,
  AgentMessage,
  DaemonToAgentMessage,
  ChatMessage,
  ChatResponse,
  PreviewResult,
  // v0.6
  SandboxLevel,
  SecurityEvent,
  QueueMessage,
  DeadLetter,
  QueueStats,
  Tenant,
  UserRole,
  User,
  AuthContext,
  MetricRollup,
  AlertRule,
  AnomalyAlert,
} from './types.js';

// Constants
export {
  OMNI_HOME,
  DB_PATH,
  CONFIG_FILE,
  AGENTS_DIR,
  LOGS_DIR,
  HEARTBEAT_INTERVAL,
  HEARTBEAT_TIMEOUT,
  MAX_HEAL_ATTEMPTS,
  MAX_AGENTS,
  AGENT_MEMORY_LIMIT,
  ZOMBIE_ERROR_THRESHOLD,
  ZOMBIE_CHECK_WINDOW,
  WHITELISTED_PACKAGES,
  FORBIDDEN_APIS,
  MESH_RATE_LIMIT,
  MESH_MAX_PAYLOAD_SIZE,
  MAX_SPAWN_DEPTH,
  SPAWN_RATE_LIMIT,
  MAX_SNAPSHOTS_PER_AGENT,
  // v0.6
  SANDBOX_TIMEOUT_STRICT,
  SANDBOX_TIMEOUT_STANDARD,
  SANDBOX_TIMEOUT_PERMISSIVE,
  SANDBOX_MEMORY_STRICT,
  SANDBOX_MEMORY_STANDARD,
  SANDBOX_MEMORY_PERMISSIVE,
  QUEUE_MAX_RETRIES,
  QUEUE_BACKPRESSURE_LIMIT,
  QUEUE_CLEANUP_DAYS,
  QUEUE_BATCH_SIZE,
  API_KEY_PREFIX,
  API_KEY_LENGTH,
  DEFAULT_TENANT_ID,
  MAX_AGENTS_FREE,
  MAX_AGENTS_PRO,
  METRIC_ROLLUP_INTERVAL,
  ANOMALY_Z_THRESHOLD,
  ANOMALY_WINDOW_HOURS,
  ALERT_CHECK_INTERVAL,
  APP_VERSION,
} from './constants.js';

// Errors
export { OmniError, Errors } from './errors.js';

// Logger
export type { LogLevel } from './logger.js';
export { initLogger, log } from './logger.js';

// Recipes
export type { AgentRecipe } from './recipes.js';
export { BUILT_IN_RECIPES, listRecipes, getRecipe, searchRecipes } from './recipes.js';

// Auth utilities
export { generateApiKey, hashApiKey, isValidApiKeyFormat } from './auth.js';

// Environment configuration
export type { EnvConfig } from './env.js';
export { getEnvConfig, validateEnv } from './env.js';

// Utility helpers
export { getErrorMessage, safeJsonParse } from './utils.js';
