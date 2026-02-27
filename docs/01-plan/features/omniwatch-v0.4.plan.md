# OmniWatch v0.4 Plan - Monorepo + Web Dashboard

## 1. Overview

**Feature Name**: omniwatch-v0.4
**Version**: 0.4.0
**Goal**: Turborepo 모노레포 전환 + Hono REST API + Next.js Web Dashboard를 구축하여 CLI 전용 플랫폼을 웹 기반 관제 시스템으로 확장한다.
**Priority**: Critical
**Estimated Scope**: 40+ files, ~5,000 LOC

## 2. Background & Motivation

v0.3까지 CLI+TUI 기반 에이전트 관리 플랫폼을 완성했다 (3,701 LOC, 114 tests, 14 commands, 3 agent types). 그러나 Definition.md §3.E의 Plugin System, TOML Config, Web Dashboard 등 핵심 확장 요구가 미구현:

- **Web Dashboard 부재**: CLI만으로는 모니터링 접근성 한계
- **단일 패키지 구조**: 확장성/빌드 효율 한계
- **HTTP API 부재**: 외부 연동/대시보드 불가
- **Plugin 미지원**: 알림 채널/템플릿 확장 불가
- **npm 미배포**: 글로벌 설치 불가

MEMORY.md의 아키텍처 비전(Turborepo + Hono + Next.js 15)을 v0.4에서 실현한다.

## 3. Feature Requirements

### FR-01: Turborepo Monorepo Migration
- pnpm workspace + Turborepo 설정
- 기존 코드를 `apps/cli`, `apps/daemon` 으로 분리
- 공유 코드를 `packages/shared`, `packages/db`, `packages/ai` 로 추출
- 빌드 파이프라인: `turbo build` 로 전체 빌드
- 기존 테스트 전수 통과 유지

### FR-02: HTTP REST API (Hono)
- `apps/api` — Hono 기반 REST API 서버
- Daemon Unix Socket을 프록시하는 API 엔드포인트:
  - `GET /api/agents` — 에이전트 목록
  - `GET /api/agents/:id` — 에이전트 상세
  - `POST /api/agents` — 에이전트 생성
  - `DELETE /api/agents/:id` — 에이전트 삭제
  - `POST /api/agents/:id/start` — 시작
  - `POST /api/agents/:id/stop` — 중지
  - `GET /api/agents/:id/logs` — 로그 조회
  - `GET /api/notifications` — 알림 이력
  - `GET /api/system/status` — 시스템 상태
  - `WebSocket /ws` — 실시간 이벤트 스트리밍
- CORS 설정, 에러 핸들링, 요청 검증 (zod)

### FR-03: Web Dashboard (Next.js 15)
- `apps/web` — Next.js 15 App Router + Tailwind CSS + shadcn/ui
- **Glass Console** 테마 (다크 모드, 글래스모피즘)
- 페이지:
  - `/` — Dashboard 홈 (에이전트 현황, 시스템 메트릭)
  - `/agents` — 에이전트 목록 + 검색/필터
  - `/agents/:id` — 에이전트 상세 (로그, 메트릭, 제어)
  - `/agents/new` — 자연어로 에이전트 생성
  - `/notifications` — 알림 이력
  - `/settings` — 설정 관리
- 실시간 업데이트: WebSocket으로 에이전트 상태/로그 스트리밍
- 상태 관리: Zustand

### FR-04: Shared Packages
- `packages/shared` — types, constants, errors, ipc-protocol
- `packages/db` — SQLite schema, migration, query helpers
- `packages/ai` — Claude API client wrapper
- TypeScript project references로 패키지 간 타입 공유

### FR-05: Plugin System
- 플러그인 인터페이스 정의:
  - `NotificationPlugin`: 알림 채널 확장
  - `TemplatePlugin`: 에이전트 템플릿 확장
- 플러그인 로딩: `~/.omniwatch/plugins/` 디렉토리에서 동적 import
- 플러그인 매니페스트: `plugin.json` (name, version, type, entry)
- 내장 채널(webhook, slack 등)을 플러그인으로 재구조화

### FR-06: npm Publish & Distribution
- `packages/omniwatch` (CLI+Daemon 통합) npm 배포 패키지
- `npm i -g omniwatch` 로 글로벌 설치
- `bin` 필드에 `omni`, `omnid` 등록
- README.md npm badge, install instructions 업데이트
- `.npmignore` / `files` 필드 정리
- `prepublishOnly` 스크립트에서 빌드+테스트 실행

## 4. Out of Scope (v0.5+)

- PostgreSQL migration (v0.5)
- Docker containerization
- Agent-to-Agent event bus (v0.5)
- TOML config migration (minor — JSON 유지)
- Homebrew tap
- Multi-tenant / team collaboration
- OAuth / JWT 인증 (v0.5 — Dashboard 보안)

## 5. Technical Approach

### 5.1 Monorepo Structure

```
omniwatch/
├── apps/
│   ├── cli/           # CLI client (Commander.js)
│   ├── daemon/        # Background daemon
│   ├── api/           # Hono REST API
│   └── web/           # Next.js Dashboard
├── packages/
│   ├── shared/        # Types, constants, errors
│   ├── db/            # SQLite schema + queries
│   └── ai/            # Claude API client
├── turbo.json
├── pnpm-workspace.yaml
├── package.json       # Root workspace
└── tsconfig.base.json # Shared TS config
```

### 5.2 Migration Strategy

1. **Phase A**: 루트에 Turborepo 설정, pnpm workspace 생성
2. **Phase B**: `packages/shared` 추출 (types, constants, errors, ipc-protocol)
3. **Phase C**: `packages/db` 추출 (db.ts, config.ts)
4. **Phase D**: `packages/ai` 추출 (code-generator의 Claude 호출 부분)
5. **Phase E**: `apps/cli` 이동 (src/cli → apps/cli/src)
6. **Phase F**: `apps/daemon` 이동 (src/daemon → apps/daemon/src)
7. **Phase G**: 기존 테스트 import 경로 수정 + 전수 통과 확인
8. **Phase H**: `apps/api` 신규 (Hono)
9. **Phase I**: `apps/web` 신규 (Next.js)

### 5.3 API Server Design

```typescript
// apps/api/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { zValidator } from '@hono/zod-validator';

const app = new Hono();
app.use('*', cors());

// Daemon IPC bridge: API → Unix Socket → Daemon
app.get('/api/agents', agentRoutes.list);
app.post('/api/agents', agentRoutes.create);
// ... etc
```

### 5.4 Dashboard Architecture

```
Next.js 15 App Router
├── app/
│   ├── layout.tsx           # Root layout (dark theme)
│   ├── page.tsx             # Dashboard home
│   ├── agents/
│   │   ├── page.tsx         # Agent list
│   │   ├── [id]/page.tsx    # Agent detail
│   │   └── new/page.tsx     # Create agent
│   ├── notifications/
│   │   └── page.tsx         # Notification history
│   └── settings/
│       └── page.tsx         # Settings
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── agent-card.tsx       # Agent status card
│   ├── log-viewer.tsx       # Real-time log viewer
│   ├── metric-chart.tsx     # Agent metrics chart
│   └── prompt-input.tsx     # Natural language input
├── lib/
│   ├── api.ts               # API client (fetch wrapper)
│   ├── ws.ts                # WebSocket client
│   └── store.ts             # Zustand stores
└── hooks/
    ├── use-agents.ts
    ├── use-logs.ts
    └── use-ws.ts
```

### 5.5 Implementation Order

```
Step 1: Monorepo scaffolding (turbo, pnpm, tsconfig)
Step 2: packages/shared 추출
Step 3: packages/db 추출
Step 4: packages/ai 추출
Step 5: apps/cli 이동 + import 수정
Step 6: apps/daemon 이동 + import 수정
Step 7: 전체 빌드 + 기존 테스트 통과 확인
Step 8: apps/api 구현 (Hono REST + WebSocket)
Step 9: apps/web 구현 (Next.js Dashboard)
Step 10: Plugin system 인터페이스 + 내장 플러그인 전환
Step 11: npm publish 설정
Step 12: 신규 테스트 + 전체 통합 확인
```

## 6. New Dependencies

### apps/api
- `hono` — HTTP framework
- `@hono/node-server` — Node.js adapter
- `@hono/zod-validator` — Request validation
- `ws` — WebSocket server
- `zod` — Schema validation (already used in shared)

### apps/web
- `next` 15.x — React framework
- `tailwindcss` 4.x — CSS framework
- `@tailwindcss/postcss` — PostCSS plugin
- `lucide-react` — Icons
- `zustand` — State management
- `recharts` — Charts

### Root
- `turbo` — Monorepo build orchestration
- `pnpm` — Package manager (workspace)

## 7. Success Criteria

- [ ] `turbo build` 전체 패키지 빌드 성공
- [ ] 기존 114 테스트 전수 통과
- [ ] `omni watch/do/auto` CLI 기능 정상 동작
- [ ] API 서버에서 에이전트 CRUD 동작
- [ ] Web Dashboard에서 에이전트 목록/상세/생성 가능
- [ ] WebSocket으로 실시간 로그 스트리밍
- [ ] Plugin 인터페이스 정의 + 내장 플러그인 1개 이상 동작
- [ ] `npm pack` 으로 패키지 생성 가능
- [ ] Gap analysis match rate >= 90%

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 모노레포 전환 시 import 경로 대량 변경 | 빌드 실패 | Phase별 점진적 이동, 매 단계 테스트 |
| Hono + Unix Socket 브릿지 복잡도 | API 지연 | 직접 DB 접근 옵션 (daemon 우회) |
| Next.js 15 + shadcn/ui 초기 설정 | 시간 소요 | 최소 UI부터 점진적 확장 |
| WebSocket 연결 안정성 | 실시간 끊김 | 자동 재연결 + fallback polling |
| Plugin 동적 import 보안 | 악성 플러그인 | 서명 검증 + 샌드박스 (v0.5) |

## 9. Version Comparison Target

| Metric | v0.3 | v0.4 Target |
|--------|------|-------------|
| Architecture | Single package | Turborepo monorepo |
| CLI Commands | 14 | 14 (maintained) |
| API Endpoints | 0 | 10+ |
| Web Pages | 0 | 6 |
| Packages | 1 | 7 (4 apps + 3 packages) |
| Total Tests | 114 | 160+ |
| Agent Types | 3 | 3 (maintained) |
| Distribution | local only | npm global |
