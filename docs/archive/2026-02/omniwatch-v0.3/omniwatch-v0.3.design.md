# Vigil v0.3 Design Document

## 1. Component Diagram

```
                       CLI Layer
┌──────────┬──────────┬──────────┬──────────┐
│ watch.ts │  do.ts   │ auto.ts  │ list.ts  │  (+ existing commands)
└────┬─────┴────┬─────┴────┬─────┴────┬─────┘
     │          │          │          │
     └──────────┴──────────┴──────────┘
                    │ IPC
              ┌─────▼──────┐
              │ rpc-server │
              └─────┬──────┘
                    │
     ┌──────────────┼──────────────────┐
     │              │                  │
┌────▼────┐  ┌─────▼──────┐   ┌──────▼───────┐
│ agent-  │  │ smart-     │   │ self-healer  │
│ manager │  │ throttle   │   │ (enhanced)   │
│ (+limit)│  └─────┬──────┘   └──────────────┘
└────┬────┘        │
     │        ┌────▼─────┐
     │        │ notifier │
     │        └──────────┘
     │
┌────▼────────────┐
│ code-validator  │
│ (+loop detect)  │
└─────────────────┘
```

## 2. Detailed Design per Feature

### 2.1 FR-01: `vigil do` Command

**File**: `src/cli/commands/do.ts`

```typescript
// Command definition
program.command('do')
  .argument('<prompt>', 'Task description')
  .option('--once', 'Run once and stop')
  .option('--schedule <cron>', 'Cron expression for scheduling')
  .option('-p, --preview', 'Preview before running')
  .option('-t, --template <name>', 'Template name')
```

**RPC Flow**: `agent.create` with `{ type: 'doer', once: boolean, schedule?: string }`

**Agent Template** (`src/agent/templates/doer.ts`):
- System prompt instructs AI to generate task-execution code
- For `--once`: code runs, completes, calls `process.exit(0)`
- For `--schedule`: daemon scheduler manages cron-based execution
- SDK additions documented in prompt

### 2.2 FR-02: `vigil auto` Command

**File**: `src/cli/commands/auto.ts`

```typescript
program.command('auto')
  .argument('<prompt>', 'Autonomous agent description')
  .option('-p, --preview', 'Preview before running')
  .option('-t, --template <name>', 'Template name')
```

**Agent Template** (`src/agent/templates/auto.ts`):
- System prompt encourages autonomous decision-making
- Agent maintains internal state, decides when to notify
- Loop-based: evaluate → decide → act → sleep → repeat

### 2.3 FR-03: Resource Enforcement

**File**: `src/daemon/agent-manager.ts` — modify `createAgentRecord()`

```typescript
// Before creating agent, check running count
export function enforceAgentLimit(): void {
  const db = getDb();
  const { count } = db.prepare(
    "SELECT COUNT(*) as count FROM agents WHERE status IN ('running', 'creating', 'ready')"
  ).get() as { count: number };

  if (count >= MAX_AGENTS) {
    throw Errors.MAX_AGENTS_EXCEEDED(count, MAX_AGENTS);
  }
}
```

**Errors** (`src/shared/errors.ts` — add):
```typescript
MAX_AGENTS_EXCEEDED: (current: number, max: number) =>
  new Error(`Agent limit reached: ${current}/${max} active agents`)
```

### 2.4 FR-04: Code Validator Enhancement

**File**: `src/daemon/code-validator.ts` — add to `walkNode` visitor:

**Loop Detection**:
```typescript
// Detect while(true), for(;;) without break/return
if (node.type === 'WhileStatement' || node.type === 'ForStatement') {
  if (isInfiniteLoop(node) && !hasBreakOrReturn(node.body)) {
    issues.push('Potential infinite loop detected without break/return');
  }
}
```

**Helper Functions**:
- `isInfiniteLoop(node)`: checks `while(true)`, `while(1)`, `for(;;)`
- `hasBreakOrReturn(body)`: recursive check for break/return in body
- `checkNestingDepth(node, depth)`: warns if depth > 10

**Dynamic Eval Detection**:
```typescript
// globalThis['eval'], Reflect.apply(eval, ...)
if (node.type === 'MemberExpression'
    && node.computed
    && node.property.type === 'Literal'
    && FORBIDDEN_APIS.includes(node.property.value)) {
  issues.push(`Dynamic access to forbidden API: ${node.property.value}`);
}
```

### 2.5 FR-05: Self-Healing Enhancement

**File**: `src/daemon/self-healer.ts`

**Changes**:
1. Gather context before healing:
   - Last 20 log lines for the agent
   - Error stack trace
   - Current agent code
   - Agent config and metadata

2. Enhanced Claude prompt:
```
The agent failed. Here is the full context:
- Original prompt: {prompt}
- Error: {error}
- Stack: {stack}
- Recent logs: {logs}
- Current code: {code}

Analyze the root cause and fix the code.
```

3. Exponential backoff:
```typescript
const backoffMs = Math.min(60_000 * Math.pow(3, agent.heal_count), 900_000);
// 1min → 3min → 9min (capped at 15min)
```

4. Same-error detection: if `last_error` matches current error pattern, skip heal.

### 2.6 FR-06: Smart Throttle

**New File**: `src/daemon/smart-throttle.ts`

```typescript
interface ThrottleState {
  lastSent: number;      // timestamp
  suppressedCount: number;
}

const throttleMap = new Map<string, ThrottleState>();

const THROTTLE_WINDOWS: Record<Severity, number> = {
  critical: 0,          // always send
  warning: 5 * 60_000,  // 5 min
  info: 15 * 60_000,    // 15 min
};

export function shouldThrottle(agentId: string, severity: Severity): boolean {
  const key = `${agentId}:${severity}`;
  const state = throttleMap.get(key);
  const window = THROTTLE_WINDOWS[severity];

  if (!state || Date.now() - state.lastSent >= window) {
    throttleMap.set(key, { lastSent: Date.now(), suppressedCount: 0 });
    return false;
  }

  state.suppressedCount++;
  return true;
}

// Cleanup stale entries every 30 min
export function cleanupThrottle(): void {
  const now = Date.now();
  for (const [key, state] of throttleMap) {
    if (now - state.lastSent > 30 * 60_000) {
      throttleMap.delete(key);
    }
  }
}
```

**Integration**: `notifier.ts` calls `shouldThrottle()` before dispatching.

### 2.7 FR-07: SDK Expansion

**File**: `src/agent/sdk.ts` — add to `createSDK()`:

```typescript
sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
},

async retry<T>(fn: () => Promise<T>, opts?: {
  maxRetries?: number;
  delay?: number;
  backoff?: number;
}): Promise<T> {
  const { maxRetries = 3, delay = 1000, backoff = 2 } = opts || {};
  let lastError: Error;
  for (let i = 0; i <= maxRetries; i++) {
    try { return await fn(); }
    catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (i < maxRetries) await this.sleep(delay * Math.pow(backoff, i));
    }
  }
  throw lastError!;
},

async timeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
},
```

**Types**: Update `VigilSDK` interface accordingly.

### 2.8 FR-08: Database Improvements

**File**: `src/shared/db.ts` — add to `migrate()`:

```sql
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_created ON agents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_severity ON notifications(severity, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_metrics (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id    TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  run_count   INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  avg_duration_ms REAL DEFAULT 0,
  last_duration_ms INTEGER DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_metrics_agent ON agent_metrics(agent_id);
```

### 2.9 FR-09: Agent Type Field

**Types** (`src/shared/types.ts`):
```typescript
export type AgentType = 'watcher' | 'doer' | 'auto';

// Add to Agent interface:
type: AgentType;
```

**DB Migration**: Add `type TEXT DEFAULT 'watcher'` to agents table.

### 2.10 FR-10: Tests

| Test File | Coverage |
|-----------|----------|
| `tests/do-command.test.ts` | do command option parsing, --once, --schedule |
| `tests/auto-command.test.ts` | auto command parsing |
| `tests/smart-throttle.test.ts` | throttle windows, cleanup, edge cases |
| `tests/resource-enforcement.test.ts` | max agents limit, error messages |
| `tests/code-validator-loops.test.ts` | loop detection, nesting depth |
| `tests/sdk-utils.test.ts` | sleep, retry, timeout SDK methods |
| `tests/self-healer-enhanced.test.ts` | context gathering, backoff |

## 3. Implementation Order

```
Step 1: Types & DB (foundation)
  └─ types.ts: AgentType, SDK types
  └─ db.ts: indices, agent_metrics, type column
  └─ errors.ts: MAX_AGENTS_EXCEEDED

Step 2: SDK expansion
  └─ sdk.ts: sleep, retry, timeout

Step 3: Code validator enhancement
  └─ code-validator.ts: loop detection, depth check

Step 4: Resource enforcement
  └─ agent-manager.ts: enforceAgentLimit()

Step 5: Agent templates (doer, auto)
  └─ templates/doer.ts
  └─ templates/auto.ts
  └─ base-prompt.ts: update SDK docs in prompt

Step 6: CLI commands (do, auto)
  └─ commands/do.ts
  └─ commands/auto.ts
  └─ index.ts: register commands

Step 7: Smart throttle
  └─ smart-throttle.ts
  └─ notifier.ts: integrate throttle

Step 8: Self-healing enhancement
  └─ self-healer.ts: context, backoff

Step 9: Tests
  └─ All test files

Step 10: Version bump + build verification
```

## 4. API Changes

### New RPC Params for `agent.create`:
```json
{
  "prompt": "...",
  "template": "doer|auto|...",
  "type": "watcher|doer|auto",
  "once": false,
  "schedule": "*/5 * * * *"
}
```

### Error Codes (new):
| Code | Name | Message |
|------|------|---------|
| -32003 | MAX_AGENTS | Agent limit reached: {n}/{max} |

## 5. Backward Compatibility

- `vigil watch` 동작 변경 없음
- DB 마이그레이션은 `CREATE IF NOT EXISTS`로 안전
- `agents.type` 기본값 `'watcher'`로 기존 데이터 호환
- SDK 확장은 추가만 (기존 메서드 변경 없음)
