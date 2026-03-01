# Vigil v0.6 Plan — Agent Sandbox + Persistent Queue + Multi-Tenant + Analytics

## 1. Overview

**Feature Name**: vigil-v0.6
**Version**: 0.6.0
**Goal**: Vigil를 프로덕션-레디 플랫폼으로 진화. 보안 샌드박스, 메시지 영속성, 멀티테넌트, 운영 분석 기능을 구현하여 팀/조직 단위 운영이 가능한 AI Agent 관제 플랫폼으로 격상시킨다.
**Priority**: Critical
**Estimated Scope**: 40+ new/modified files, ~5,000 LOC

## 2. Background & Motivation

v0.5에서 Agent Mesh, Spawn Chain, Time Travel, Omni MCP를 통해 에이전트 인프라 플랫폼의 기본을 완성했다. v0.6에서는 프로덕션 운영에 필수적인 4가지 영역을 강화한다:

### 시장 포지셔닝
- **Agent Sandbox**: Deno/Cloudflare Workers의 격리 모델을 로컬 에이전트에 적용
- **Persistent Queue**: Kafka/Redis Streams 수준의 메시지 보장을 SQLite 기반으로 구현
- **Multi-Tenant**: GitHub Organizations/Slack Workspaces 수준의 팀 접근 제어
- **Agent Analytics**: Datadog/Grafana 수준의 에이전트 성능 분석을 내장

## 3. Feature Requirements

### FR-01: Agent Sandbox (보안 격리 실행 환경)

에이전트 코드를 격리된 환경에서 실행하여 호스트 시스템 보안을 보장한다.

- **Node.js VM2 Sandbox**: `vm2` 또는 `isolated-vm`으로 에이전트 코드 격리 실행
- **파일시스템 제한**: 에이전트별 전용 디렉토리만 접근 허용 (chroot 유사)
- **네트워크 제한**: 에이전트별 허용 도메인 화이트리스트 (`allowed_hosts` 설정)
- **리소스 제한 강화**: 메모리 상한(256MB), CPU 시간 제한(30초/실행), 파일 크기 제한(10MB)
- **시스템 콜 제한**: `child_process.exec`, `fs.rmdir('/')` 등 위험 API 차단
- **감사 로그**: 샌드박스 위반 시도를 `security_events` 테이블에 기록
- **설정**: `agent.config.sandbox` 필드로 per-agent 보안 레벨 설정 (`strict` / `standard` / `permissive`)

### FR-02: Persistent Queue (메시지 영속 큐)

Agent Mesh의 인메모리 이벤트 버스를 영속 큐로 업그레이드하여 메시지 손실을 방지한다.

- **SQLite 기반 큐**: `message_queue` 테이블 (id, topic, payload, status, retry_count, created_at, processed_at)
- **At-Least-Once 보장**: ACK 기반 메시지 소비 + 재시도 (최대 3회)
- **Dead Letter Queue**: 3회 실패 메시지를 `dead_letters` 테이블로 이동
- **배압(Backpressure)**: 에이전트별 미처리 큐 상한 (1,000건) 초과 시 publish 거부
- **배치 소비**: `sdk.mesh.consumeBatch(topic, batchSize)` — 배치 처리 지원
- **큐 모니터링 API**: `GET /api/queue/stats`, `GET /api/queue/dead-letters`
- **자동 정리**: 처리 완료 메시지 7일 후 자동 삭제 (cron)

### FR-03: Multi-Tenant (팀 기반 접근 제어)

팀/조직 단위로 에이전트를 격리하고 접근을 제어한다.

- **테넌트 모델**: `tenants` 테이블 (id, name, plan, created_at)
- **사용자 모델**: `users` 테이블 (id, tenant_id, email, role, api_key_hash)
- **역할 기반 접근**: `admin` (전체 권한), `operator` (실행/중지), `viewer` (읽기 전용)
- **API Key 인증**: `X-API-Key` 헤더 기반 인증 미들웨어
- **에이전트 소유권**: `agents.tenant_id` 컬럼 추가, 테넌트 간 격리
- **쿼터 관리**: 테넌트별 에이전트 수, AI 사용량, 스토리지 쿼터
- **CLI 인증**: `omni auth login`, `omni auth token`, `omni auth whoami`
- **Web 로그인**: API Key 기반 간단한 인증 (OAuth는 v0.7 이후)

### FR-04: Agent Analytics (운영 분석 대시보드)

에이전트 성능, 비용, 패턴을 실시간으로 분석하고 시각화한다.

- **메트릭 수집**: `agent_metrics` 테이블 (agent_id, metric_name, value, timestamp)
  - 실행 시간, 에러율, 재시작 횟수, 힐링 성공률, 이벤트 처리량
- **집계 뷰**: 시간별/일별/주별 롤업 (materialized view 패턴)
- **이상 탐지**: 에러율 급등, 메모리 증가 추세, 비정상 패턴 감지 (Z-score 기반)
- **비용 분석**: Glass Box 데이터 통합, 에이전트별/테넌트별 AI 비용 추적
- **대시보드 위젯**:
  - 에이전트 건강도 히트맵
  - 이벤트 흐름 토폴로지 그래프
  - 비용 추세 차트
  - 이상 알림 타임라인
- **내보내기**: CSV/JSON 데이터 내보내기 API
- **알림 규칙**: 임계값 기반 자동 알림 (에러율 > 10%, 비용 > $X/day 등)

## 4. DB Schema Changes

```sql
-- FR-01: Sandbox security events
CREATE TABLE IF NOT EXISTS security_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- 'fs_violation', 'net_violation', 'resource_exceeded', 'api_blocked'
  detail TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- FR-02: Persistent message queue
CREATE TABLE IF NOT EXISTS message_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  payload TEXT NOT NULL,
  from_agent TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'done', 'failed'
  retry_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  processed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_mq_topic_status ON message_queue(topic, status);

CREATE TABLE IF NOT EXISTS dead_letters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_id INTEGER,
  topic TEXT NOT NULL,
  payload TEXT NOT NULL,
  error TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- FR-03: Multi-tenant tables
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  max_agents INTEGER DEFAULT 10,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'viewer',  -- 'admin', 'operator', 'viewer'
  api_key_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Extend agents table
ALTER TABLE agents ADD COLUMN tenant_id TEXT DEFAULT 'default';
ALTER TABLE agents ADD COLUMN sandbox_level TEXT DEFAULT 'standard';

-- FR-04: Agent metrics
CREATE TABLE IF NOT EXISTS agent_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value REAL NOT NULL,
  timestamp TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_metrics_agent_time ON agent_metrics(agent_id, timestamp);

CREATE TABLE IF NOT EXISTS metric_rollups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  period TEXT NOT NULL,       -- 'hourly', 'daily', 'weekly'
  min_value REAL,
  max_value REAL,
  avg_value REAL,
  count INTEGER,
  period_start TEXT NOT NULL,
  UNIQUE(agent_id, metric_name, period, period_start)
);

CREATE TABLE IF NOT EXISTS alert_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT DEFAULT 'default',
  metric_name TEXT NOT NULL,
  operator TEXT NOT NULL,     -- 'gt', 'lt', 'gte', 'lte'
  threshold REAL NOT NULL,
  window_minutes INTEGER DEFAULT 5,
  notify_channels TEXT,       -- JSON array: ["slack", "discord"]
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
```

## 5. Architecture Changes

### 신규 파일
| Path | Purpose |
|------|---------|
| `apps/daemon/src/sandbox.ts` | VM2/isolated-vm 기반 샌드박스 런타임 |
| `apps/daemon/src/sandbox-policy.ts` | 보안 정책 정의 (허용 API, 도메인 등) |
| `apps/daemon/src/message-queue.ts` | SQLite 기반 영속 큐 엔진 |
| `apps/daemon/src/dead-letter.ts` | Dead letter 큐 처리 |
| `apps/daemon/src/metrics-collector.ts` | 메트릭 수집기 (agent lifecycle hook) |
| `apps/daemon/src/metrics-rollup.ts` | 시간별 집계 cron 작업 |
| `apps/daemon/src/anomaly-detector.ts` | Z-score 기반 이상 탐지 |
| `apps/daemon/src/handlers/queue.ts` | 큐 RPC 핸들러 |
| `apps/daemon/src/handlers/tenant.ts` | 테넌트/사용자 관리 RPC 핸들러 |
| `apps/api/src/middleware/auth.ts` | API Key 인증 미들웨어 |
| `apps/api/src/routes/queue.ts` | 큐 모니터링 API |
| `apps/api/src/routes/tenants.ts` | 테넌트/사용자 관리 API |
| `apps/api/src/routes/analytics.ts` | 분석 대시보드 API |
| `apps/web/src/app/analytics/page.tsx` | Analytics 대시보드 페이지 |
| `apps/web/src/app/queue/page.tsx` | 큐 모니터링 페이지 |
| `apps/web/src/app/settings/page.tsx` | 테넌트/사용자 설정 페이지 |
| `packages/shared/src/auth.ts` | API Key 해싱/검증 유틸리티 |
| `packages/db/src/migrations/v0.6.ts` | v0.6 마이그레이션 스크립트 |

### 수정 파일
| Path | Change |
|------|--------|
| `apps/daemon/src/agent/runtime.ts` | 샌드박스 런타임 통합 |
| `apps/daemon/src/event-bus.ts` | 인메모리 → persistent queue 전환 |
| `apps/daemon/src/agent-manager.ts` | 메트릭 수집 hook, 테넌트 ID 전달 |
| `apps/daemon/src/rpc-server.ts` | 큐/테넌트/분석 핸들러 등록 |
| `apps/api/src/index.ts` | 인증 미들웨어 + 신규 라우트 마운트 |
| `apps/cli/src/commands/` | `auth` 명령어 추가 |
| `apps/web/src/app/layout.tsx` | Analytics, Queue, Settings 네비게이션 |
| `packages/shared/src/types.ts` | Tenant, User, Metric, AlertRule 타입 추가 |
| `packages/shared/src/constants.ts` | v0.6 상수 추가 |
| `packages/db/src/schema.ts` | v0.6 테이블/인덱스 추가 |

## 6. Implementation Phases

### Phase 1: Agent Sandbox (Week 1)
1. `sandbox.ts` + `sandbox-policy.ts` 구현
2. `runtime.ts` 통합 (sandbox_level에 따라 분기)
3. `security_events` 테이블 + 로깅
4. 테스트: 격리 검증 (위험 API 차단, 리소스 제한)

### Phase 2: Persistent Queue (Week 1-2)
1. `message_queue.ts` + `dead-letter.ts` 구현
2. `event-bus.ts` 리팩터링 (인메모리 → SQLite 큐)
3. SDK 확장: `sdk.mesh.consumeBatch()`
4. 큐 모니터링 API + 정리 cron
5. 테스트: at-least-once 보장, 배압, DLQ

### Phase 3: Multi-Tenant (Week 2)
1. DB 마이그레이션 (tenants, users 테이블)
2. API Key 인증 미들웨어
3. 테넌트/사용자 관리 API + CLI 명령어
4. 에이전트 소유권 격리
5. 테스트: 인증, 권한 검증, 테넌트 격리

### Phase 4: Agent Analytics (Week 2-3)
1. 메트릭 수집기 (lifecycle hook)
2. 집계 cron + 이상 탐지
3. 분석 API + 대시보드 페이지
4. 알림 규칙 엔진
5. 테스트: 메트릭 정확성, 이상 탐지, 알림

### Phase 5: Integration & Polish (Week 3)
1. 전체 통합 테스트
2. Web UI 통합 (Analytics, Queue, Settings 페이지)
3. MCP 서버 확장 (analytics, queue 도구)
4. 문서 업데이트

## 7. Success Criteria

- [ ] 에이전트 코드가 샌드박스 외부 파일/네트워크에 접근 불가
- [ ] 메시지 큐 장애 복구 후 미전달 메시지 재전송 확인
- [ ] API Key로 인증된 요청만 에이전트 제어 가능
- [ ] 다른 테넌트의 에이전트 목록/제어 불가
- [ ] 에러율 급등 시 10분 이내 알림 발생
- [ ] 160+ 기존 테스트 + 50+ 신규 테스트 통과
- [ ] Gap Analysis 90%+ 달성

## 8. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| VM2 보안 취약점 | High | `isolated-vm` 대안 + 정기 업데이트 |
| SQLite 큐 성능 | Medium | WAL 모드 + 배치 INSERT + VACUUM |
| 인증 우회 | High | 미들웨어 레벨 강제 + 테스트 커버리지 |
| 메트릭 폭증 | Medium | 집계 후 원본 삭제, 최대 보존 기간 설정 |

## 9. Non-Goals (v0.7+)

- OAuth/OIDC 통합 로그인
- 분산 큐 (Redis/Kafka 백엔드)
- WebAssembly 샌드박스 (WASM runtime)
- Agent Marketplace (공개 레시피 공유)
- 실시간 협업 (다중 사용자 동시 편집)
