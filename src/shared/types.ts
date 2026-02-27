// Agent types
export type AgentType = 'watcher' | 'doer' | 'auto';

// Agent status lifecycle
export type AgentStatus =
  | 'creating'
  | 'ready'
  | 'running'
  | 'stopped'
  | 'error'
  | 'healing'
  | 'destroyed';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  prompt: string;
  description: string | null;
  status: AgentStatus;
  code_hash: string | null;
  schedule: string | null;
  config: string; // JSON
  pid: number | null;
  heal_count: number;
  error_count: number;
  last_run_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentConfig {
  interval?: number;
  timeout?: number;
  retryCount?: number;
  dependencies?: string[];
  env?: Record<string, string>;
}

export interface AgentLog {
  id: number;
  agent_id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata: string | null; // JSON
  created_at: string;
}

export interface Notification {
  id: number;
  agent_id: string;
  channel: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'sent' | 'failed';
  created_at: string;
}

// IPC Protocol
export interface RPCRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: Record<string, unknown>;
}

export interface RPCResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: RPCError;
}

export interface RPCError {
  code: number;
  message: string;
  data?: unknown;
}

export interface RPCNotification {
  jsonrpc: '2.0';
  method: 'stream';
  params: { type: string; data: unknown };
}

// Agent Runtime Messages (child_process IPC)
export type AgentMessage =
  | { type: 'heartbeat'; timestamp: number }
  | { type: 'log'; level: string; message: string; metadata?: Record<string, unknown> }
  | { type: 'notify'; message: string; options?: { title?: string; severity?: 'critical' | 'warning' | 'info' } }
  | { type: 'store.get'; key: string; requestId: string }
  | { type: 'store.set'; key: string; value: unknown; requestId: string }
  | { type: 'store.delete'; key: string; requestId: string }
  | { type: 'error'; error: string; stack?: string };

export type DaemonToAgentMessage =
  | { type: 'store.result'; requestId: string; value: unknown }
  | { type: 'shutdown' };

// v0.2: Chat types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
  modifiedCode?: string;
  action?: 'apply' | 'info';
}

export interface PreviewResult {
  name: string;
  description: string;
  code: string;
  dependencies: string[];
  validation: { valid: boolean; issues: string[] };
}
