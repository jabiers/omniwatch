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
  // v0.5: Spawn Chain
  parent_id: string | null;
  spawn_depth: number;
  // v0.6: Multi-Tenant + Sandbox
  tenant_id: string;
  sandbox_level: SandboxLevel;
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
  | { type: 'error'; error: string; stack?: string }
  // v0.5: Agent Mesh
  | { type: 'mesh.publish'; topic: string; payload: unknown }
  | { type: 'mesh.subscribe'; topic: string }
  | { type: 'mesh.unsubscribe'; topic: string }
  // v0.5: Spawn Chain
  | { type: 'spawn.create'; prompt: string; options?: { name?: string; type?: AgentType; schedule?: string }; requestId: string }
  // v0.5: Time Travel
  | { type: 'snapshot'; label?: string; requestId: string };

export type DaemonToAgentMessage =
  | { type: 'store.result'; requestId: string; value: unknown }
  | { type: 'shutdown' }
  // v0.5: Agent Mesh
  | { type: 'mesh.event'; topic: string; payload: unknown; from: string }
  // v0.5: Spawn Chain
  | { type: 'spawn.result'; requestId: string; agentId?: string; error?: string }
  // v0.5: Time Travel
  | { type: 'snapshot.result'; requestId: string; seq: number };

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

// v0.6: Agent Sandbox
export type SandboxLevel = 'strict' | 'standard' | 'permissive';

export interface SecurityEvent {
  id: number;
  agent_id: string;
  event_type: 'fs_violation' | 'net_violation' | 'resource_exceeded' | 'api_blocked';
  detail: string | null;
  created_at: string;
}

// v0.6: Persistent Queue
export interface QueueMessage {
  id: number;
  topic: string;
  payload: string;
  from_agent: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  retry_count: number;
  created_at: string;
  processed_at: string | null;
}

export interface DeadLetter {
  id: number;
  original_id: number | null;
  topic: string;
  payload: string;
  error: string | null;
  created_at: string;
}

export interface QueueStats {
  pending: number;
  processing: number;
  done_today: number;
  dead_letters: number;
}

// v0.6: Multi-Tenant
export interface Tenant {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  max_agents: number;
  created_at: string;
}

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  role: UserRole;
  api_key_hash: string;
  created_at: string;
}

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: UserRole;
}

// v0.6: Analytics
export interface MetricRollup {
  id: number;
  agent_id: string;
  metric_name: string;
  period: 'hourly' | 'daily' | 'weekly';
  min_value: number;
  max_value: number;
  avg_value: number;
  count: number;
  period_start: string;
}

export interface AlertRule {
  id: number;
  tenant_id: string;
  metric_name: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte';
  threshold: number;
  window_minutes: number;
  notify_channels: string; // JSON array
  enabled: boolean;
  created_at: string;
}

export interface AnomalyAlert {
  agent_id: string;
  metric_name: string;
  current_value: number;
  mean: number;
  stddev: number;
  z_score: number;
}
