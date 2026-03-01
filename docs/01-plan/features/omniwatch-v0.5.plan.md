# Vigil v0.5 Plan — Agent Mesh + Spawn Chain + Time Travel + Omni MCP

## 1. Overview

**Feature Name**: vigil-v0.5
**Version**: 0.5.0
**Goal**: 4개 킬러 피처를 통해 Vigil를 "AI Agent Infrastructure Platform"으로 진화. 에이전트 간 통신, 자율 생성, 상태 디버깅, MCP 생태계 연결을 구현한다.
**Priority**: Critical
**Estimated Scope**: 30+ new files, ~4,000 LOC

## 2. Background & Motivation

v0.4에서 Turborepo 모노레포 + Hono REST API + Next.js Web Dashboard를 완성했고, v0.5 Week 1에서 Local Brain(Ollama), Glass Box(비용 추적), Agent Recipes(마켓플레이스)를 구현했다. 남은 4개 피처는 Vigil를 단순 모니터링 도구에서 자율형 에이전트 인프라 플랫폼으로 격상시키는 핵심 기능이다.

### 시장 포지셔닝
- **Agent Mesh**: CrewAI/AutoGen의 멀티에이전트 통신을 런타임에서 해결
- **Spawn Chain**: BabyAGI의 자율 태스크 분해를 에이전트 레벨로 구현
- **Time Travel**: LangSmith 추적의 "이전 상태 복원" 기능을 로컬에서 제공
- **Omni MCP**: MCP 생태계(월 9,700만+ SDK 다운로드)와 네이티브 연결

## 3. Feature Requirements

### FR-01: Agent Mesh (에이전트 간 이벤트 버스)

에이전트가 토픽 기반 pub/sub으로 메시지를 교환하여 자율적 파이프라인을 구성한다.

- **EventBus 엔진**: 인메모리 토픽 기반 라우터 (daemon 내부)
- **SDK 확장**: `sdk.mesh.publish(topic, payload)`, `sdk.mesh.subscribe(topic, callback)`
- **IPC 프로토콜 확장**: `mesh.publish`, `mesh.event`, `mesh.subscribe`, `mesh.unsubscribe` 메시지 타입
- **이벤트 로그**: `mesh_events` 테이블에 모든 이벤트 영구 기록
- **구독 관리**: `mesh_subscriptions` 테이블에 에이전트별 토픽 구독 저장
- **API 엔드포인트**: `GET /api/mesh/topology`, `GET /api/mesh/events`, `POST /api/mesh/publish`
- **보안**: 이벤트 페이로드 크기 제한 (64KB), 브로드캐스트 속도 제한 (100/min/agent)

### FR-02: Spawn Chain (자율 하위 에이전트 생성)

에이전트가 런타임에서 하위 에이전트를 자율적으로 생성하고 관리한다.

- **SDK 확장**: `sdk.spawn(prompt, options)` → 하위 에이전트 생성 + 시작
- **계보 추적**: agents 테이블에 `parent_id`, `spawn_depth` 컬럼 추가
- **깊이 제한**: 최대 3단계 (상수 `MAX_SPAWN_DEPTH`)
- **자원 관리**: 부모 에이전트의 MAX_AGENTS 쿼터에서 자식 카운트 포함
- **연쇄 삭제**: 부모 destroy 시 모든 자식 에이전트 재귀적 destroy
- **API 엔드포인트**: `GET /api/agents/:id/children`, `POST /api/agents/:id/spawn`
- **보안**: 스폰 속도 제한 (5/min/agent), 깊이 초과 시 거부

### FR-03: Time Travel (상태 리플레이 디버깅)

에이전트 실행 상태를 스냅샷으로 저장하고, 과거 상태로 복원하여 디버깅한다.

- **자동 스냅샷**: 에이전트 시작/종료/에러 시 자동 캡처
- **수동 스냅샷**: `sdk.snapshot(label)` → 코드 내에서 명시적 캡처
- **스냅샷 데이터**: agent 레코드 + agent_store 전체 + 최근 로그 50건
- **스냅샷 저장**: `agent_snapshots` 테이블 (agent_id, seq, state_json, created_at)
- **복원 기능**: 스냅샷의 store 데이터를 agent_store에 덮어쓰기
- **보관 정책**: 에이전트당 최대 50개 스냅샷, FIFO 순환
- **API 엔드포인트**: `GET /api/agents/:id/snapshots`, `POST /api/agents/:id/snapshots`, `POST /api/agents/:id/restore/:seq`

### FR-04: Omni MCP (Model Context Protocol 브릿지)

Vigil를 MCP 서버로 노출하여 Claude, Cursor 등에서 에이전트를 도구로 사용한다.

- **MCP 서버**: Streamable HTTP 트랜스포트 (`/mcp` 엔드포인트)
- **MCP SDK**: `@modelcontextprotocol/sdk` 패키지 사용
- **노출 도구**:
  - `list_agents` — 에이전트 목록
  - `get_agent` — 에이전트 상세
  - `create_agent` — 에이전트 생성
  - `start_agent` / `stop_agent` — 에이전트 제어
  - `get_agent_logs` — 로그 조회
  - `get_system_status` — 시스템 상태
- **노출 리소스**:
  - `agent://{agentId}/status` — 에이전트 상태
  - `agent://{agentId}/logs` — 에이전트 로그
- **보안**: Origin 헤더 검증, 세션 기반 인증, rate limit

## 4. Out of Scope (v0.6+)

- MCP 클라이언트 (외부 MCP 서버 연결)
- Agent Mesh 외부 메시지 큐 (Redis, NATS) 연동
- Time Travel 코드 변경 diff 추적
- PostgreSQL 마이그레이션
- Docker containerization
- OAuth / JWT 인증

## 5. Technical Approach

### 5.1 New Files

```
apps/daemon/src/
├── event-bus.ts          # Agent Mesh — 인메모리 pub/sub 라우터
├── spawn-manager.ts      # Spawn Chain — 하위 에이전트 생성 관리
├── time-travel.ts        # Time Travel — 스냅샷 캡처/복원
├── mcp-server.ts         # Omni MCP — MCP 프로토콜 서버
├── handlers/
│   ├── mesh.ts           # Mesh RPC handlers
│   └── mcp.ts            # MCP RPC handlers

packages/db/src/
├── mesh.ts               # mesh_events, mesh_subscriptions CRUD
├── snapshots.ts          # agent_snapshots CRUD

apps/api/src/routes/
├── mesh.ts               # GET /mesh/topology, /mesh/events
├── mcp.ts                # MCP Streamable HTTP transport

apps/web/src/app/
├── mesh/page.tsx          # Mesh 토폴로지 + 이벤트 뷰
├── agents/[id]/
│   └── (기존 page.tsx에 Spawn Chain, Snapshots 탭 추가)

packages/shared/src/
├── (types.ts 확장 — 새로운 메시지 타입, 인터페이스)
```

### 5.2 DB Schema Changes

```sql
-- Agent Mesh
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

-- Spawn Chain (agents 테이블 확장)
ALTER TABLE agents ADD COLUMN parent_id TEXT REFERENCES agents(id) ON DELETE SET NULL;
ALTER TABLE agents ADD COLUMN spawn_depth INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_agents_parent ON agents(parent_id);

-- Time Travel
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

### 5.3 SDK Extension

```typescript
interface VigilSDK {
  // ... 기존 메서드 유지
  mesh: {
    publish(topic: string, payload: unknown): Promise<void>;
    subscribe(topic: string, callback: (payload: unknown, from: string) => void): void;
    unsubscribe(topic: string): void;
  };
  spawn(prompt: string, options?: { name?: string; type?: AgentType; schedule?: string }): Promise<string>;
  snapshot(label?: string): Promise<number>;
}
```

### 5.4 Implementation Order

```
Phase 1: DB 스키마 마이그레이션 + 타입 확장
Phase 2: Agent Mesh (EventBus + SDK + API + UI)
Phase 3: Spawn Chain (Manager + SDK + API + Agent Detail 탭)
Phase 4: Time Travel (Snapshot + SDK + API + Agent Detail 탭)
Phase 5: Omni MCP (Server + Tools + API endpoint)
Phase 6: 통합 테스트 + 빌드 검증
Phase 7: 보안 검증 + Gap Analysis
```

### 5.5 Test Strategy

각 피처별 테스트:
- **Agent Mesh**: EventBus 단위 테스트 (publish/subscribe/unsubscribe, 토픽 필터링, 페이로드 크기 제한)
- **Spawn Chain**: 깊이 제한 테스트, 연쇄 삭제 테스트, 쿼터 검증
- **Time Travel**: 스냅샷 캡처/복원 테스트, 최대 개수 순환 테스트
- **Omni MCP**: MCP 프로토콜 핸드셰이크, Tool 등록/호출, 에러 핸들링
- **통합**: 전체 빌드, 기존 116 테스트 회귀 없음, 새 테스트 20+개

## 6. New Dependencies

### apps/daemon
- `@modelcontextprotocol/sdk` — MCP 프로토콜 서버/클라이언트
- `zod` — MCP SDK peer dependency (이미 프로젝트에 존재)

### apps/web
- 추가 의존성 없음 (기존 Tailwind + lucide-react로 충분)

## 7. Success Criteria

- [ ] `turbo build` 전체 빌드 성공
- [ ] 기존 116 테스트 회귀 없음
- [ ] 새 테스트 20+개 추가
- [ ] Agent Mesh: 에이전트 간 pub/sub 메시지 교환 동작
- [ ] Spawn Chain: 에이전트가 하위 에이전트 생성 가능 (깊이 제한 적용)
- [ ] Time Travel: 스냅샷 캡처/복원 동작
- [ ] Omni MCP: Claude Code에서 `list_agents` 도구 호출 가능
- [ ] Gap analysis match rate >= 90%

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mesh 이벤트 폭풍 | 메모리/CPU 과부하 | 에이전트당 100/min 속도 제한 |
| Spawn Chain 폭발 | 에이전트 수 초과 | 깊이 3 제한 + MAX_AGENTS 쿼터 |
| 스냅샷 DB 비대화 | 디스크 부족 | 에이전트당 50개 FIFO 순환 |
| MCP 프로토콜 변경 | 호환성 깨짐 | SDK 버전 고정, 프로토콜 버전 명시 |
| IPC 메시지 충돌 | 기존 기능 영향 | 새 메시지 타입에 prefix 사용 (mesh.*, spawn.*) |
