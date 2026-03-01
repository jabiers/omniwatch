# Vigil v0.5 Design — Agent Mesh + Spawn Chain + Time Travel + Omni MCP

## 1. Architecture Overview

```
                    ┌─────────────────────────────┐
                    │     External MCP Clients     │
                    │  (Claude Code, Cursor, etc.) │
                    └────────────┬────────────────┘
                                 │ Streamable HTTP
                    ┌────────────▼────────────────┐
                    │      Hono API Server         │
                    │  (REST + WebSocket + MCP)    │
                    │       Port 3456              │
                    └────────────┬────────────────┘
                                 │ Unix Socket IPC
                    ┌────────────▼────────────────┐
                    │         Daemon               │
                    │  ┌─────────────────────┐     │
                    │  │    Event Bus        │     │
                    │  │  (Agent Mesh)       │     │
                    │  └──────┬──────────────┘     │
                    │  ┌──────▼──────────────┐     │
                    │  │  Agent Manager      │     │
                    │  │  + Spawn Manager    │     │
                    │  │  + Time Travel      │     │
                    │  └──────┬──────────────┘     │
                    │         │ fork()              │
                    │  ┌──────▼──────────────┐     │
                    │  │  Agent Processes    │     │
                    │  │  (SDK: mesh, spawn, │     │
                    │  │   snapshot)         │     │
                    │  └─────────────────────┘     │
                    └──────────────────────────────┘
```

## 2. FR-01: Agent Mesh — Detailed Design

### 2.1 EventBus Engine (`apps/daemon/src/event-bus.ts`)

```typescript
interface MeshEvent {
  id: string;              // nanoid
  topic: string;           // e.g., "btc.price", "alert.*"
  publisherId: string;     // agent ID
  payload: unknown;        // max 64KB JSON
  timestamp: number;
}

interface EventBus {
  publish(publisherId: string, topic: string, payload: unknown): void;
  subscribe(agentId: string, topic: string): void;
  unsubscribe(agentId: string, topic: string): void;
  getSubscriptions(agentId: string): string[];
  getTopicSubscribers(topic: string): string[];
}
```

**라우팅 규칙**:
- 정확 매칭: `btc.price` → `btc.price` 구독자에게만 전달
- 와일드카드: `btc.*` → `btc.price`, `btc.volume` 등 모든 btc 서브토픽에 매칭
- 셀프 구독 불가: 발행자 자신에게는 전달하지 않음

**속도 제한**:
- 에이전트당 100 이벤트/분 (MESH_RATE_LIMIT)
- 이벤트 페이로드 최대 64KB (MESH_MAX_PAYLOAD_SIZE)

### 2.2 IPC Protocol Extension

```typescript
// Agent → Daemon
| { type: 'mesh.publish'; topic: string; payload: unknown }
| { type: 'mesh.subscribe'; topic: string }
| { type: 'mesh.unsubscribe'; topic: string }

// Daemon → Agent
| { type: 'mesh.event'; topic: string; payload: unknown; from: string }
```

### 2.3 DB Tables

```sql
CREATE TABLE mesh_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  publisher_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_mesh_events_topic ON mesh_events(topic, created_at DESC);

CREATE TABLE mesh_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(agent_id, topic)
);
```

### 2.4 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/mesh/topology | 에이전트 간 연결 그래프 (노드 + 엣지) |
| GET | /api/mesh/events | 최근 이벤트 로그 (limit, topic 필터) |
| POST | /api/mesh/publish | 외부에서 이벤트 발행 (테스트용) |

### 2.5 SDK Methods

```typescript
sdk.mesh = {
  publish(topic: string, payload: unknown): Promise<void>,
  subscribe(topic: string, callback: (payload: unknown, from: string) => void): void,
  unsubscribe(topic: string): void,
};
```

### 2.6 Web UI — `/mesh` Page

- 에이전트 노드 목록 (연결 상태 표시)
- 토픽별 구독자 리스트
- 최근 이벤트 스트림 (실시간)
- 이벤트 발행 테스트 폼

## 3. FR-02: Spawn Chain — Detailed Design

### 3.1 Schema Extension

```sql
ALTER TABLE agents ADD COLUMN parent_id TEXT REFERENCES agents(id) ON DELETE SET NULL;
ALTER TABLE agents ADD COLUMN spawn_depth INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_agents_parent ON agents(parent_id);
```

### 3.2 Spawn Manager (`apps/daemon/src/spawn-manager.ts`)

```typescript
interface SpawnOptions {
  name?: string;
  type?: AgentType;
  schedule?: string;
}

async function spawnChildAgent(
  parentId: string,
  prompt: string,
  options: SpawnOptions
): Promise<string>  // returns child agent ID
```

**로직**:
1. 부모 에이전트 존재 확인
2. 부모의 `spawn_depth` 확인 → child의 depth = parent.depth + 1
3. `spawn_depth >= MAX_SPAWN_DEPTH(3)` → 에러
4. 전체 에이전트 수 확인 → MAX_AGENTS 초과 시 거부
5. `createAgentRecord()` 호출 (parent_id, spawn_depth 설정)
6. 자동 시작

### 3.3 IPC Protocol Extension

```typescript
// Agent → Daemon
| { type: 'spawn.create'; prompt: string; options?: SpawnOptions; requestId: string }

// Daemon → Agent
| { type: 'spawn.result'; requestId: string; agentId: string; error?: string }
```

### 3.4 Cascade Destroy

`destroyAgent(id)` 수정:
```
1. SELECT id FROM agents WHERE parent_id = :id AND status != 'destroyed'
2. 각 자식에 대해 재귀적 destroyAgent(childId)
3. 부모 에이전트 destroy
```

### 3.5 SDK Method

```typescript
sdk.spawn = async (prompt: string, options?: SpawnOptions): Promise<string>
```

내부적으로 IPC `spawn.create` 메시지 전송 → requestId 기반 응답 대기

### 3.6 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/agents/:id/children | 직계 자식 목록 |
| POST | /api/agents/:id/spawn | 외부에서 자식 에이전트 생성 |

### 3.7 Web UI Enhancement

`/agents/:id` 페이지에 Spawn Chain 탭 추가:
- 계보 트리 (parent → children)
- 자식 에이전트 상태 표시
- 수동 스폰 버튼

## 4. FR-03: Time Travel — Detailed Design

### 4.1 Snapshot Schema

```sql
CREATE TABLE agent_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  label TEXT,
  state_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(agent_id, seq)
);
CREATE INDEX idx_snapshots_agent ON agent_snapshots(agent_id, seq DESC);
```

### 4.2 State JSON Format

```json
{
  "agent": {
    "id": "agent-xxx",
    "name": "...",
    "status": "running",
    "config": "...",
    "heal_count": 0,
    "error_count": 0
  },
  "store": {
    "key1": "value1",
    "key2": "value2"
  },
  "recentLogs": [
    { "level": "info", "message": "...", "created_at": "..." }
  ]
}
```

### 4.3 Time Travel Manager (`apps/daemon/src/time-travel.ts`)

```typescript
async function captureSnapshot(agentId: string, label?: string): Promise<number>;
async function restoreSnapshot(agentId: string, seq: number): Promise<void>;
async function listSnapshots(agentId: string): Promise<SnapshotMeta[]>;
async function pruneSnapshots(agentId: string, maxCount: number): Promise<void>;
```

**자동 캡처 트리거**:
- 에이전트 시작 시 (label: "start")
- 에이전트 정상 종료 시 (label: "stop")
- 에이전트 에러 시 (label: "error:{message}")
- self-healing 전 (label: "pre-heal")

**복원 로직**:
1. 스냅샷의 store 데이터 로드
2. 현재 agent_store를 DELETE
3. 스냅샷의 store 데이터를 INSERT
4. 에이전트 상태를 "ready"로 변경
5. 로그 기록: "Restored to snapshot #{seq}"

### 4.4 IPC Protocol Extension

```typescript
// Agent → Daemon
| { type: 'snapshot'; label?: string; requestId: string }

// Daemon → Agent
| { type: 'snapshot.result'; requestId: string; seq: number }
```

### 4.5 SDK Method

```typescript
sdk.snapshot = async (label?: string): Promise<number>  // returns seq number
```

### 4.6 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/agents/:id/snapshots | 스냅샷 목록 (seq, label, created_at) |
| POST | /api/agents/:id/snapshots | 수동 스냅샷 캡처 |
| POST | /api/agents/:id/restore/:seq | 특정 스냅샷으로 복원 |

### 4.7 Web UI Enhancement

`/agents/:id` 페이지에 Snapshots 탭 추가:
- 스냅샷 타임라인 리스트
- 각 스냅샷의 store 데이터 미리보기
- 복원 버튼 (확인 다이얼로그 포함)
- 수동 스냅샷 캡처 버튼

## 5. FR-04: Omni MCP — Detailed Design

### 5.1 MCP Server Setup (`apps/api/src/routes/mcp.ts`)

Hono API 서버 내에 Streamable HTTP 트랜스포트로 MCP 서버를 구현한다.

**엔드포인트**:
- `POST /mcp` — MCP 요청 처리
- `GET /mcp` — SSE 스트림 (서버→클라이언트 알림)
- `DELETE /mcp` — 세션 종료

### 5.2 MCP Tools (6개)

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `list_agents` | List all monitoring agents | `filter?`: status filter |
| `get_agent` | Get agent details | `agentId`: agent ID |
| `create_agent` | Create new agent from prompt | `prompt`, `name?`, `type?` |
| `start_agent` | Start a stopped agent | `agentId` |
| `stop_agent` | Stop a running agent | `agentId` |
| `get_agent_logs` | Get agent logs | `agentId`, `limit?`, `level?` |

### 5.3 MCP Resources (2개)

| URI Template | Description |
|--------------|-------------|
| `agent://{agentId}/status` | Agent status (JSON) |
| `agent://{agentId}/logs` | Recent agent logs (JSON) |

### 5.4 Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.27.0",
  "zod": "^3.25.0"
}
```

### 5.5 Web UI — Settings Page Enhancement

Settings 페이지에 MCP 섹션 추가:
- MCP 서버 상태 표시 (활성/비활성)
- 등록된 Tool 목록
- MCP 엔드포인트 URL 복사 버튼

## 6. Test Strategy

### 6.1 Unit Tests

| Test File | Coverage |
|-----------|----------|
| `tests/event-bus.test.ts` | publish/subscribe/unsubscribe, 와일드카드, 속도제한, 페이로드 크기 |
| `tests/spawn-manager.test.ts` | 생성, 깊이제한, 연쇄삭제, 쿼터 |
| `tests/time-travel.test.ts` | 캡처, 복원, 순환삭제, 라벨링 |
| `tests/mcp-server.test.ts` | Tool 등록, Tool 호출, 에러처리, 리소스 |
| `tests/mesh-db.test.ts` | mesh_events, mesh_subscriptions CRUD |
| `tests/snapshot-db.test.ts` | agent_snapshots CRUD |

### 6.2 Integration Tests

- 전체 빌드 (turbo build) 성공
- 기존 116 테스트 회귀 없음
- Mesh: 에이전트 A가 publish → 에이전트 B가 수신
- Spawn: 에이전트가 sdk.spawn() → 자식 에이전트 생성 확인
- Time Travel: 스냅샷 캡처 → store 변경 → 복원 → store 원복 확인
- MCP: initialize → list_tools → call_tool 전체 플로우

## 7. Security Considerations

| 영역 | 위협 | 대응 |
|------|------|------|
| Mesh | 이벤트 폭풍 (DoS) | 100/min/agent 속도제한 |
| Mesh | 대용량 페이로드 | 64KB 크기 제한 |
| Spawn | 에이전트 폭발 | depth 3, rate 5/min |
| Spawn | 리소스 고갈 | MAX_AGENTS 쿼터 공유 |
| Time Travel | 스냅샷 비대화 | 50개/agent FIFO |
| Time Travel | 민감 데이터 유출 | store 값만 복원 (코드 불변) |
| MCP | 무인증 접근 | Origin 검증 + 세션 관리 |
| MCP | 악의적 Tool 호출 | 입력 검증 (Zod) + rate limit |

## 8. Navigation Update

```typescript
const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/mesh", label: "Mesh", icon: Network },       // NEW
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/usage", label: "Usage", icon: DollarSign },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];
```
