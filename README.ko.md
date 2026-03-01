[English](README.md) | **한국어**

# OmniWatch

> AI 기반 자율형 관제 플랫폼 — **"Don't Config, Just Speak"**

OmniWatch는 원하는 작업을 자연어로 설명하면 AI가 자동으로 백그라운드 에이전트를 생성, 실행, 모니터링하고 24시간 자가 복구하는 플랫폼입니다. CLI와 대시보드+REST API를 단일 포트로 제공하는 통합 웹 서버를 포함합니다.

```
$ omni watch "Alert me when AirPods Pro drops below $250 on Amazon"
Agent [amazon-airpods] created and running.

$ omni list
ID              NAME                STATUS    LAST CHECK
agent-a1b2      amazon-airpods      running   30s ago
agent-c3d4      btc-price-alert     running   10s ago
agent-e5f6      hackernews-ai       running   2m ago
```

## 빠른 시작

### Docker (권장)

```bash
docker compose up -d
# API at http://localhost:3456
# API Docs at http://localhost:3456/api/docs
```

### 소스에서 빌드

```bash
git clone https://github.com/jabiers/omniwatch.git
cd omniwatch
pnpm install
pnpm build

# 전체 시작 (API + Dashboard)
pnpm dev
# Dashboard at http://localhost:3457 (API is proxied automatically)

# 대시보드 로그인을 위한 API 키 생성
node apps/cli/dist/index.js auth create-key --role admin
# 출력된 키를 저장하세요 — 다시 표시되지 않습니다

# AI 프로바이더 키 설정
node apps/cli/dist/index.js config set ai.api_key sk-ant-xxxxx

# 첫 번째 에이전트 생성
node apps/cli/dist/index.js watch "Check Hacker News every hour for AI-related posts"
```

> **팁:** `omni` 단축 명령어를 사용하려면 CLI를 전역으로 링크하세요:
> ```bash
> cd apps/cli && pnpm link --global
> ```

## 기능

### 핵심 에이전트 시스템
- **Prompt-to-Agent** -- 자연어로 작업을 설명하면 백그라운드 에이전트가 실행됩니다
- **세 가지 에이전트 유형** -- Watcher (모니터링), Doer (실행), Auto (자율 판단)
- **자가 복구** -- 에이전트가 비정상 종료되면 AI가 자동으로 진단하고 복구합니다
- **스마트 스로틀** -- 심각도 기반 알림 빈도 제어
- **멀티 채널 알림** -- Slack, Discord, Telegram, Webhook, 시스템 알림
- **에이전트 템플릿** -- 웹 모니터링, API 점검, RSS 피드를 위한 사전 제작 템플릿
- **AST 코드 검증** -- 배포 전 보안 우선 정적 분석

### Agent Mesh (v0.5)
- **Event Bus** -- 토픽 기반 Pub/sub 에이전트 간 통신
- **Spawn Chain** -- 에이전트가 깊이 제한 내에서 하위 에이전트를 생성 가능
- **Time Travel** -- 상태 스냅샷 캡처 및 복원
- **MCP Server** -- Model Context Protocol 통합 (7개 도구, 3개 리소스)
- **Local Brain** -- 오프라인 AI를 위한 Ollama 통합
- **Glass Box** -- 에이전트 내부 관찰 및 실시간 코드 편집
- **Recipes** -- 원클릭 설치가 가능한 사전 제작 에이전트 템플릿

### 엔터프라이즈 (v0.6)
- **Agent Sandbox** -- isolated-vm을 활용한 VM 기반 격리 (strict/standard/permissive)
- **Persistent Queue** -- SQLite 기반 at-least-once 전달, DLQ 및 배압 제어
- **Multi-Tenant** -- API 키 인증, RBAC (admin/operator/viewer), 테넌트 격리
- **Analytics** -- 메트릭 수집기, 시간/일 단위 롤업, Z-score 이상 탐지, 알림 규칙

### 플랫폼 (v0.7-v0.9)
- **OAuth/OIDC** -- CSRF 보호를 포함한 GitHub 및 Google 로그인
- **Agent Marketplace** -- 커뮤니티 레시피 공유, 검색 및 설치
- **OpenAPI Docs** -- `/api/docs`에서 Swagger UI로 전체 엔드포인트 문서 제공
- **실시간 WebSocket** -- 하트비트 및 자동 재연결이 포함된 실시간 에이전트 상태 업데이트
- **성공 토스트** -- 에이전트 라이프사이클 작업에 대한 즉각적인 피드백

### 통합 아키텍처 (v2.0-v2.2)
- **단일 프로세스** -- 데몬 엔진이 API 서버에 내장되어 IPC 오버헤드 제거
- **직접 함수 호출** -- Unix Socket RPC 제거, 모든 엔진 호출이 인프로세스로 수행
- **CLI HTTP API** -- CLI가 HTTP로 통신 (데몬 스폰 없음, Unix Socket 없음)

### 패키지 통합 (v4.0)
- **단일 패키지** -- 데몬 엔진이 API 서버 패키지에 병합 (`apps/api/src/engine/`)
- **제로 IPC** -- 모든 엔진 호출이 직접 함수 임포트, 별도 데몬 프로세스 없음
- **빌드 간소화** -- 5개 패키지 (기존 6개), 단일 tsup 설정의 다중 엔트리 포인트

### 품질 및 보안 (v3.0+)
- **테스트 스위트** -- 60개 파일, 518개 테스트 (루트 397 + 웹 121)
- **쿼리 최적화** -- 프로덕션 코드 SELECT * 제로; 모든 쿼리 명시적 컬럼 사용
- **입력 검증** -- @hono/zod-validator를 통한 모든 API 라우트 Zod 스키마 적용
- **에러 핸들링** -- 모든 비동기 라우트 핸들러에 try-catch 및 구조화된 JSON 에러 응답
- **보안 강화** -- 벌크 작업 테넌트 격리, SSRF 방지, 웹훅 마스킹
- **대시보드 테스트** -- 14개 전체 페이지 렌더 테스트 커버

## 아키텍처

```
[Terminal]                              [Browser]
    |                                       |
    v                                       v
[CLI: omni] --------HTTP---------> [통합 API 서버 (Hono + Engine)]
                                       |              |
                                       |--fork--> [Agent A] (sandbox)
                                       |--fork--> [Agent B] (sandbox)
                                       |--fork--> [Agent N] (sandbox)
                                       v
                                 [SQLite DB (WAL)]
                                 |-- 18 tables
                                 +-- versioned migrations (v001-v006)

                          [Next.js Dashboard] --API proxy--> [API Server]
```

| 레이어 | 역할 |
|-------|------|
| **CLI** (`omni`) | 경량 HTTP 클라이언트. 15개 명령어 + Ink TUI. HTTP로 API와 통신. |
| **API 서버** (`apps/api`) | 통합 Hono 서버 (65개 이상 엔드포인트) + 내장 데몬 엔진 + WebSocket + MCP. |
| **Engine** (`apps/daemon`) | 에이전트 라이프사이클, 헬스 체크, AI, 샌드박스, 큐, 메트릭 — API 내부에서 인프로세스 실행. |
| **Web** (`apps/web`) | Next.js 15 Glass Console. 인증, 차트, 관리자 기능을 갖춘 14개 페이지. |
| **Agent** | SDK를 갖춘 샌드박스 Node.js 프로세스 (`omni.fetch`, `omni.notify`, `omni.store`). |

## 웹 대시보드

Glass Console 대시보드 (포트 3457)는 플랫폼에 대한 전체 제어를 제공합니다.

| 페이지 | 경로 | 설명 |
|------|------|-------------|
| 대시보드 | `/` | 에이전트 상태 그리드, 시스템 메트릭, 실시간 WebSocket 업데이트 |
| 에이전트 목록 | `/agents` | 페이지네이션, 필터링이 가능한 테이블 및 일괄 작업, 상태 배지 |
| 에이전트 상세 | `/agents/[id]` | 로그, 메트릭, 스냅샷, 채팅, 코드 에디터, Spawn Chain |
| 에이전트 생성 | `/agents/new` | AI 기반 코드 미리보기가 포함된 자연어 프롬프트 입력 |
| Mesh | `/mesh` | 에이전트 Event Bus 토폴로지, 구독, 페이지네이션된 이벤트 스트림 |
| Analytics | `/analytics` | 메트릭 차트, 이상 탐지, 알림 규칙 CRUD |
| Queue | `/queue` | 메시지 큐 통계, 페이지네이션된 Dead Letter 관리 |
| Marketplace | `/marketplace` | 커뮤니티 레시피 검색, 설치 및 게시 |
| Recipes | `/recipes` | 내장 에이전트 템플릿 |
| Usage | `/usage` | AI 토큰 사용량 및 비용 추적 |
| Notifications | `/notifications` | 페이지네이션, 필터링 가능한 알림 이력 |
| Tenants | `/tenants` | 멀티 테넌트 및 사용자 관리 (관리자 전용) |
| Settings | `/settings` | AI, 알림, 에이전트 설정 |
| Login | `/login` | API 키 인증 및 세션 관리 |

## API

- **REST API**: Zod 유효성 검증 및 RBAC 인가가 적용된 65개 이상의 엔드포인트
- **WebSocket**: 하트비트 ping/pong이 포함된 실시간 에이전트 상태 업데이트
- **MCP Server**: AI 통합을 위한 7개 도구 및 3개 리소스 (Streamable HTTP)
- **OpenAPI**: `/api/docs`에서 전체 엔드포인트 문서를 포함한 Swagger UI

### 인증

```bash
# API key header
curl -H "X-API-Key: omni_..." http://localhost:3456/api/agents

# OAuth Bearer token
curl -H "Authorization: Bearer <token>" http://localhost:3456/api/agents
```

### 주요 엔드포인트

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|-------------|
| GET | `/api/agents` | viewer+ | 에이전트 목록 |
| POST | `/api/agents` | operator+ | 에이전트 생성 |
| DELETE | `/api/agents/:id` | operator+ | 에이전트 삭제 |
| POST | `/api/agents/:id/start` | operator+ | 에이전트 시작 |
| POST | `/api/agents/:id/stop` | operator+ | 에이전트 중지 |
| POST | `/api/agents/:id/restart` | operator+ | 에이전트 재시작 |
| POST | `/api/agents/bulk` | operator+ | 일괄 시작/중지/재시작/삭제 |
| GET | `/api/agents/:id/logs` | viewer+ | 에이전트 로그 |
| GET | `/api/agents/:id/metrics` | viewer+ | 에이전트 메트릭 |
| GET | `/api/agents/:id/snapshots` | viewer+ | Time Travel 스냅샷 |
| POST | `/api/agents/:id/chat` | operator+ | 에이전트와 채팅 |
| POST | `/api/agents/preview` | operator+ | AI 코드 미리보기 |
| POST | `/api/agents/:id/apply` | operator+ | 미리보기 코드 적용 |
| POST | `/api/auth/login` | -- | API 키 로그인 |
| GET | `/api/auth/me` | token | 현재 사용자 정보 |
| POST | `/api/auth/logout` | token | 로그아웃 |
| GET | `/api/auth/github` | -- | GitHub OAuth 시작 |
| GET | `/api/auth/google` | -- | Google OAuth 시작 |
| GET | `/api/mesh/events` | viewer+ | Mesh 이벤트 |
| GET | `/api/mesh/topology` | viewer+ | 에이전트 Mesh 토폴로지 |
| GET | `/api/analytics/metrics` | viewer+ | 메트릭 롤업 |
| GET | `/api/analytics/anomalies` | viewer+ | 이상 탐지 |
| CRUD | `/api/analytics/alerts` | operator+ | 알림 규칙 |
| GET | `/api/security/events` | admin | 보안 감사 로그 |
| GET | `/api/queue/stats` | viewer+ | 큐 통계 |
| GET | `/api/queue/dead-letters` | operator+ | Dead Letter 큐 |
| GET | `/api/marketplace` | viewer+ | 레시피 탐색 |
| POST | `/api/marketplace` | operator+ | 레시피 게시 |
| POST | `/api/marketplace/:id/install` | operator+ | 레시피 설치 |
| DELETE | `/api/marketplace/:id` | admin | 레시피 삭제 |
| CRUD | `/api/tenants` | admin | 테넌트 관리 |
| CRUD | `/api/users` | admin | 사용자 관리 |
| POST | `/api/users/:id/rotate-key` | admin | 사용자 API 키 순환 |
| GET | `/api/system/status` | -- | 시스템 상태 |
| GET | `/api/system/health/detailed` | -- | 상세 헬스 체크 |
| GET | `/api/system/ollama` | -- | Ollama 상태 |
| POST | `/api/mcp` | -- | MCP Streamable HTTP |
| GET | `/api/docs` | -- | OpenAPI Swagger UI |
| WS | `/ws` | -- | 실시간 이벤트 |

## 보안

- **API 키 인증** -- `omni_` 접두사 + 32자리 16진수, SHA-256 해시 저장
- **OAuth/OIDC** -- CSRF 상태 보호를 포함한 GitHub 및 Google 로그인
- **RBAC** -- 역할 기반 접근 제어: `admin` > `operator` > `viewer`
- **Agent Sandbox** -- 세 가지 보안 수준의 VM 기반 격리
- **SQL 인젝션 방지** -- 전체 코드베이스에 파라미터화된 쿼리 적용
- **보안 감사 로그** -- 모든 샌드박스 위반 사항을 DB에 기록

### 샌드박스 수준

| 수준 | 메모리 | 타임아웃 | 파일 시스템 접근 | 네트워크 |
|-------|--------|---------|-----------|---------|
| **Strict** | 64 MB | 10s | 없음 | 허용 목록만 |
| **Standard** | 128 MB | 30s | 에이전트 디렉토리 | 모든 HTTPS |
| **Permissive** | 256 MB | 60s | 에이전트 디렉토리 + tmp | 모두 |

### 코드 검증
- 금지 임포트: `child_process`, `cluster`, `net`, `vm`, `worker_threads`
- 차단 패턴: `eval()`, `new Function()`, `process.exit()`
- 배포 전 AST 수준 정적 분석
- strict 샌드박스를 위한 isolated-vm V8 Isolate

## 개발

```bash
# 의존성 설치
pnpm install

# 전체 패키지 빌드 (Turborepo)
npx turbo build

# 개발 모드 (watch)
npx turbo dev

# 전체 테스트 실행 (518개 테스트, 60개 파일)
npx vitest run

# 타입 체크
pnpm lint
```

## CI/CD

GitHub Actions 워크플로우는 `main` 브랜치에 대한 모든 push와 PR에서 실행됩니다:

1. 체크아웃 + pnpm 설정
2. `pnpm install --frozen-lockfile`
3. `npx turbo build` (전체 6개 패키지)
4. `npx vitest run` (전체 테스트 스위트)

## 데이터베이스

- **엔진**: WAL 모드의 SQLite (better-sqlite3)
- **테이블**: 18개 애플리케이션 테이블 + 1개 마이그레이션 테이블
- **마이그레이션**: 6개 버전별 마이그레이션 파일 (v001-v006)
- **주요 테이블**: agents, agent_logs, agent_metrics, agent_store, notifications, ai_usage, mesh_events, mesh_subscriptions, agent_snapshots, security_events, message_queue, dead_letters, tenants, users, metric_rollups, alert_rules, marketplace_recipes, oauth_sessions

## 프로젝트 구조

```
omniwatch/
+-- apps/
|   +-- cli/                    # CLI 클라이언트 (15개 명령어 + Ink TUI)
|   +-- api/                    # 통합 API 서버 (Hono + Engine)
|   |   +-- src/routes/         # 15개 라우트 그룹
|   |   +-- src/engine/         # 내장 엔진 (v4.0에서 daemon 패키지 병합)
|   |   +-- src/middleware/     # auth, error-handler, logger
|   |   +-- src/openapi.ts      # OpenAPI/Swagger
|   |   +-- src/ws.ts           # WebSocket 서버
|   +-- web/                    # Next.js 15 대시보드
|       +-- src/app/            # 14개 페이지 (Glass Console)
|       +-- src/components/     # Pagination, AuthGuard, ToastContainer
|       +-- src/lib/            # auth-store, toast-store, api wrapper
+-- packages/
|   +-- shared/                 # 타입, 상수, 에러, IPC, 인증
|   +-- db/                     # SQLite 스키마 + 버전별 마이그레이션
|       +-- src/migrations/     # v001-v006
+-- tests/                      # 60개 파일, 518개 테스트
+-- bin/omni.mjs                # CLI 진입점
+-- Dockerfile                  # 프로덕션 컨테이너
+-- docker-compose.yml          # Docker Compose 설정
+-- turbo.json                  # Turborepo 설정
+-- pnpm-workspace.yaml         # 워크스페이스 정의
```

## 기술 스택

| 영역 | 기술 |
|------|-----------|
| 언어 | TypeScript 5.x + Node.js 20 |
| 모노레포 | Turborepo + pnpm workspace |
| CLI | Commander.js |
| TUI | Ink (React for Terminal) |
| API | Hono + @hono/zod-validator |
| 웹 | Next.js 15 + Tailwind v4 + recharts |
| AI | Anthropic SDK + Ollama |
| 데이터베이스 | SQLite (better-sqlite3, WAL mode) |
| 샌드박스 | node:vm + isolated-vm |
| 인증 | API Key + OAuth (GitHub/Google) |
| MCP | @modelcontextprotocol/sdk |
| IPC | HTTP API (CLI → API) + 직접 함수 호출 (v2.0부터 엔진 인프로세스) |
| 빌드 | tsup (esbuild) + next build |
| 테스트 | Vitest |
| CI/CD | GitHub Actions |
| 컨테이너 | Docker + Docker Compose |

## 라이선스

MIT
