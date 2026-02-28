# OmniWatch v0.6 Design — Agent Sandbox + Persistent Queue + Multi-Tenant + Analytics

## 1. Architecture Overview

```
                    ┌─────────────┐
                    │  Next.js Web │:3457
                    │  (Dashboard) │
                    └──────┬──────┘
                           │ fetch
                    ┌──────┴──────┐
                    │  Hono API   │:3456
                    │ +Auth MW    │
                    └──────┬──────┘
                           │ rpc-bridge (Unix Socket)
                    ┌──────┴──────┐
                    │   Daemon    │
                    │ ┌─────────┐ │
                    │ │Sandbox  │ │  ← NEW: VM isolation
                    │ │Runtime  │ │
                    │ ├─────────┤ │
                    │ │PQueue   │ │  ← NEW: Persistent Queue
                    │ ├─────────┤ │
                    │ │Metrics  │ │  ← NEW: Collector + Anomaly
                    │ ├─────────┤ │
                    │ │EventBus │ │  ← UPGRADED: backed by PQueue
                    │ └─────────┘ │
                    └──────┬──────┘
                           │ fork()
                    ┌──────┴──────┐
                    │ Agent Procs │  ← sandboxed execution
                    └─────────────┘
```

## 2. FR-01: Agent Sandbox

### 2.1 Design Decisions
- **Approach**: Node.js `node:vm` + `createContext()` with curated global allowlist
- **Why not isolated-vm**: Adds native dependency complexity; `node:vm` suffices for our trust model (agents are AI-generated code we control)
- **Why not vm2**: Deprecated, known escape vulnerabilities

### 2.2 Sandbox Policy Levels
| Level | fs | net | child_process | Timeout | Memory |
|-------|----|----|---------------|---------|--------|
| strict | None | Allowlist only | Blocked | 10s | 64MB |
| standard (default) | Agent dir only | All HTTPS | Blocked | 30s | 128MB |
| permissive | Agent dir + tmp | All | Blocked | 60s | 256MB |

### 2.3 Implementation
```typescript
// sandbox.ts — Core sandbox runner
interface SandboxOptions {
  agentId: string;
  agentDir: string;
  code: string;
  level: 'strict' | 'standard' | 'permissive';
  allowedHosts?: string[];
  timeout?: number;
  memoryLimit?: number;
}

interface SandboxResult {
  success: boolean;
  error?: string;
  violations: SecurityViolation[];
}

interface SecurityViolation {
  type: 'fs_violation' | 'net_violation' | 'resource_exceeded' | 'api_blocked';
  detail: string;
  timestamp: string;
}
```

### 2.4 Security Audit Flow
```
Agent code → Sandbox Runner → Violation? → Log to security_events
                                         → Increment violation count
                                         → Kill agent if critical
```

## 3. FR-02: Persistent Queue

### 3.1 Queue Architecture
```
Publisher → message_queue (SQLite) → Consumer
               │                       │
               │ status: pending    processing → done
               │                       │
               │ retry_count > 3  →  dead_letters
               │
               └─ backpressure: reject if pending > 1000/agent
```

### 3.2 Message Lifecycle
1. **Enqueue**: INSERT into `message_queue` with status='pending'
2. **Dequeue**: SELECT + UPDATE status='processing' (batch lock)
3. **ACK**: UPDATE status='done', set processed_at
4. **NACK/timeout**: Increment retry_count, reset to 'pending'
5. **Dead Letter**: If retry_count > 3, move to `dead_letters`
6. **Cleanup**: DELETE done messages older than 7 days

### 3.3 Integration with Event Bus
```typescript
// message-queue.ts replaces in-memory delivery in event-bus.ts
export function enqueueMessage(topic: string, payload: unknown, fromAgent: string): number;
export function dequeueMessages(topic: string, limit?: number): QueueMessage[];
export function ackMessage(id: number): void;
export function nackMessage(id: number): void;
export function getQueueStats(): QueueStats;
export function getDeadLetters(limit?: number): DeadLetter[];
export function retryDeadLetter(id: number): void;
export function cleanupOldMessages(daysOld?: number): number;
```

## 4. FR-03: Multi-Tenant

### 4.1 Auth Flow
```
Request → X-API-Key header → Hash → Lookup users table
       → Match? → Attach {userId, tenantId, role} to context
       → No match? → 401 Unauthorized
```

### 4.2 RBAC Matrix
| Action | admin | operator | viewer |
|--------|-------|----------|--------|
| List agents | Own tenant | Own tenant | Own tenant |
| Create agent | Yes | No | No |
| Start/Stop agent | Yes | Yes | No |
| Delete agent | Yes | No | No |
| View logs | Yes | Yes | Yes |
| View analytics | Yes | Yes | Yes |
| Manage users | Yes | No | No |
| Manage tenant | Yes | No | No |

### 4.3 Default Tenant
- On first boot, create `default` tenant with auto-generated admin API key
- Print API key to stdout on first startup
- Existing agents assigned to `default` tenant (migration)

### 4.4 API Key Format
`omni_` + 32 random hex chars → SHA-256 hash stored in DB

## 5. FR-04: Agent Analytics

### 5.1 Metrics Pipeline
```
Agent Events → Metrics Collector → agent_metrics (raw)
                                          │
                                    Rollup Cron (hourly)
                                          │
                                    metric_rollups (aggregated)
                                          │
                                    Anomaly Detector (Z-score)
                                          │
                                    Alert Rules Engine
                                          │
                                    Notifications
```

### 5.2 Collected Metrics
| Metric | Source | Unit |
|--------|--------|------|
| exec_duration | agent lifecycle | ms |
| error_rate | agent_logs | count/period |
| heal_rate | self-healer | count/period |
| restart_count | agent-manager | count/period |
| mesh_events_sent | event-bus | count/period |
| mesh_events_received | event-bus | count/period |
| ai_cost | ai_usage | USD/period |
| memory_usage | process.memoryUsage | bytes |
| queue_depth | message_queue | count |

### 5.3 Anomaly Detection (Z-score)
```
z = (current_value - mean) / stddev
If |z| > 2.5 → trigger alert
```
Window: Last 24 hours of hourly rollups

### 5.4 Alert Rules
```typescript
interface AlertRule {
  id: number;
  tenant_id: string;
  metric_name: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte';
  threshold: number;
  window_minutes: number;
  notify_channels: string[];  // ['slack', 'discord', 'webhook']
  enabled: boolean;
}
```

## 6. DB Schema Changes

### New Tables
- `security_events` — Sandbox violation audit log
- `message_queue` — Persistent event queue
- `dead_letters` — Failed message archive
- `tenants` — Multi-tenant organizations
- `users` — API key authenticated users
- `metric_rollups` — Hourly/daily aggregated metrics
- `alert_rules` — Threshold-based alerting

### Modified Tables
- `agents` + `tenant_id TEXT DEFAULT 'default'`
- `agents` + `sandbox_level TEXT DEFAULT 'standard'`

## 7. New Shared Types

```typescript
// Tenant & Auth
interface Tenant { id: string; name: string; plan: string; max_agents: number; created_at: string; }
interface User { id: string; tenant_id: string; email: string; role: 'admin' | 'operator' | 'viewer'; api_key_hash: string; created_at: string; }
interface AuthContext { userId: string; tenantId: string; role: 'admin' | 'operator' | 'viewer'; }

// Queue
interface QueueMessage { id: number; topic: string; payload: string; from_agent: string; status: string; retry_count: number; created_at: string; }
interface QueueStats { pending: number; processing: number; done_today: number; dead_letters: number; }

// Analytics
interface MetricRollup { agent_id: string; metric_name: string; period: string; min_value: number; max_value: number; avg_value: number; count: number; period_start: string; }
interface AlertRule { id: number; tenant_id: string; metric_name: string; operator: string; threshold: number; window_minutes: number; notify_channels: string[]; enabled: boolean; }
interface AnomalyAlert { agent_id: string; metric_name: string; current_value: number; mean: number; stddev: number; z_score: number; }

// Security
interface SecurityViolation { type: 'fs_violation' | 'net_violation' | 'resource_exceeded' | 'api_blocked'; detail: string; }
type SandboxLevel = 'strict' | 'standard' | 'permissive';
```

## 8. New Constants

```typescript
// Sandbox
SANDBOX_TIMEOUT_STRICT = 10_000;
SANDBOX_TIMEOUT_STANDARD = 30_000;
SANDBOX_TIMEOUT_PERMISSIVE = 60_000;
SANDBOX_MEMORY_STRICT = 64 * 1024 * 1024;
SANDBOX_MEMORY_STANDARD = 128 * 1024 * 1024;
SANDBOX_MEMORY_PERMISSIVE = 256 * 1024 * 1024;

// Queue
QUEUE_MAX_RETRIES = 3;
QUEUE_BACKPRESSURE_LIMIT = 1000;
QUEUE_CLEANUP_DAYS = 7;
QUEUE_BATCH_SIZE = 50;

// Multi-Tenant
API_KEY_PREFIX = 'omni_';
API_KEY_LENGTH = 32;
DEFAULT_TENANT_ID = 'default';
MAX_AGENTS_FREE = 10;
MAX_AGENTS_PRO = 50;

// Analytics
METRIC_ROLLUP_INTERVAL = 3600_000;   // 1 hour
ANOMALY_Z_THRESHOLD = 2.5;
ANOMALY_WINDOW_HOURS = 24;
ALERT_CHECK_INTERVAL = 300_000;      // 5 min
```

## 9. API Routes

### New Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/queue/stats | viewer+ | Queue statistics |
| GET | /api/queue/dead-letters | operator+ | Dead letter list |
| POST | /api/queue/dead-letters/:id/retry | operator+ | Retry dead letter |
| GET | /api/tenants | admin | List tenants |
| POST | /api/tenants | admin | Create tenant |
| GET | /api/users | admin | List users in tenant |
| POST | /api/users | admin | Create user + API key |
| DELETE | /api/users/:id | admin | Delete user |
| GET | /api/analytics/metrics | viewer+ | Agent metrics |
| GET | /api/analytics/rollups | viewer+ | Aggregated metrics |
| GET | /api/analytics/anomalies | viewer+ | Recent anomalies |
| GET | /api/analytics/alerts | viewer+ | Alert rules |
| POST | /api/analytics/alerts | admin | Create alert rule |
| PUT | /api/analytics/alerts/:id | admin | Update alert rule |
| DELETE | /api/analytics/alerts/:id | admin | Delete alert rule |
| GET | /api/security/events | admin | Security audit log |

## 10. Web Pages (New)

| Path | Purpose |
|------|---------|
| /analytics | Metrics dashboard with charts |
| /queue | Queue monitor (stats, dead letters) |
| /settings (enhanced) | Tenant/user management, API keys |

## 11. Implementation Order

1. Shared types + constants (packages/shared)
2. DB migration (packages/db)
3. Sandbox (apps/daemon) — isolated from other features
4. Persistent Queue (apps/daemon) — foundation for improved mesh
5. Multi-Tenant auth (packages/shared + apps/api) — security layer
6. Analytics (apps/daemon + apps/api) — metrics pipeline
7. API routes (apps/api) — expose all features
8. Web UI (apps/web) — dashboard pages
9. Tests — unit + integration
10. Gap analysis + fixes
