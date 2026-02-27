// Types
export type {
  AgentType,
  AgentStatus,
  Agent,
  AgentConfig,
  AgentLog,
  Notification,
  RPCRequest,
  RPCResponse,
  RPCError,
  RPCNotification,
  AgentMessage,
  DaemonToAgentMessage,
  ChatMessage,
  ChatResponse,
  PreviewResult,
} from './types.js';

// Constants
export {
  OMNI_HOME,
  DB_PATH,
  SOCKET_PATH,
  PID_FILE,
  CONFIG_FILE,
  AGENTS_DIR,
  LOGS_DIR,
  HEARTBEAT_INTERVAL,
  HEARTBEAT_TIMEOUT,
  MAX_HEAL_ATTEMPTS,
  MAX_AGENTS,
  AGENT_MEMORY_LIMIT,
  WHITELISTED_PACKAGES,
  FORBIDDEN_APIS,
} from './constants.js';

// Errors
export { OmniError, Errors } from './errors.js';

// IPC Protocol
export {
  createRequest,
  createResponse,
  createErrorResponse,
  createNotification,
  RPC_ERRORS,
  encodeMessage,
  parseMessages,
} from './ipc-protocol.js';

// Logger
export type { LogLevel } from './logger.js';
export { initLogger, log } from './logger.js';
