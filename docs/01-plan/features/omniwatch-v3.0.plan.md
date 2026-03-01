# OmniWatch v3.0.0 Plan — Unified Web+API Server

## Overview
API 서버(Hono, :3456)와 Web 서버(Next.js, :3457)를 단일 프로세스로 통합하여
하나의 포트에서 대시보드 + REST API + WebSocket을 모두 서빙한다.

## Background
- v2.0~v2.2에서 Daemon을 API 서버에 내장 (Unix Socket → in-process)
- 그러나 API(:3456)와 Web(:3457)이 여전히 별도 프로세스로 실행
- 사용자 요청: "웹 환경 합쳐줄수 없나?"

## Goals
1. **Single Process**: Next.js 서버가 API + Dashboard + Engine을 모두 호스팅
2. **Single Port**: 3457 하나로 통합 (3456 제거)
3. **Docker Simplification**: 2 서비스 → 1 서비스
4. **Dev Simplification**: `pnpm dev`로 Web만 실행하면 API 자동 내장

## Technical Approach

### 1. Engine Initialization
- Next.js `instrumentation.ts` 훅으로 서버 시작 시 daemon engine 초기화
- `process.env.NEXT_RUNTIME === 'nodejs'` 체크로 Edge 런타임 제외

### 2. API Route Integration
- 기존 catch-all route (`/api/[...path]/route.ts`)가 이미 Hono app 직접 import
- `next.config.ts`에서 API rewrites 제거 (더 이상 :3456으로 프록시 불필요)
- `/health` route 추가 (Hono app에 위임)

### 3. WebSocket Support
- Next.js는 네이티브 WebSocket을 지원하지 않음
- `server.custom.mjs` — custom production server wrapper
- Node.js HTTP server + Next.js request handler + WS upgrade handler

### 4. Package Exports
- `@omniwatch/api`에 `./ws` export 추가 (WebSocket 초기화 함수)
- `@omniwatch/daemon`의 `./engine` export 활용

### 5. Infrastructure
- Dockerfile: 단일 `production` 타겟 (Next.js standalone + custom server)
- docker-compose.yml: `omniwatch` 단일 서비스, 포트 3457
- `apps/api` standalone 서버는 legacy로 유지 (호환성)

## Scope
- ✅ instrumentation.ts 생성
- ✅ next.config.ts rewrites 제거
- ✅ health route 추가
- ✅ server.custom.mjs 생성
- ✅ @omniwatch/api ws export 추가
- ✅ Dockerfile 통합
- ✅ docker-compose.yml 단일 서비스
- ✅ dev script 간소화
- ✅ README 업데이트
- ✅ Version 3.0.0 bump

## Risk
- Pre-existing test failures 5건 (api-routes, auth-middleware) — v3.0과 무관
- Next.js WebSocket은 custom server 필요 — server.custom.mjs로 해결
