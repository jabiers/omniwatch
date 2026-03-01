# OmniWatch v0.8 Design — Production Readiness

## Group 1: Security Hardening

### 1-1. OAuth 세션 토큰 해싱
```
토큰 생성: nanoid(48) → raw token → SHA-256 hash → DB 저장
토큰 검증: Bearer header → SHA-256 hash → DB lookup
응답: raw token은 생성 시 1회만 반환, 이후 해시만 비교
```
- `apps/api/src/routes/oauth.ts`: createSession() 수정, hashToken() 유틸 추가
- `apps/api/src/middleware/auth.ts`: Bearer 검증 시 해시 비교

### 1-2. CSRF/State 파라미터
```
OAuth 시작: state = nanoid(32) → Set-Cookie (httpOnly, sameSite=lax, 10min)
Callback: cookie state === query state 검증, 불일치 시 403
```
- `apps/api/src/routes/oauth.ts`: /auth/github, /auth/google에 state 생성/검증

### 1-3. SQL LIKE 인젝션 방지
```ts
function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, '\\$&');
}
// LIKE ? ESCAPE '\\' 사용
```
- `apps/api/src/routes/marketplace.ts`: search 파라미터에 적용

### 1-4. 환경변수 검증
```ts
// packages/shared/src/env.ts
export function validateEnv(): void {
  const required = ['OMNI_DATA_DIR'];
  const optional = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GITHUB_CLIENT_ID', ...];
  // 필수 변수 없으면 throw, 선택 변수 없으면 warn
}
```
- `.env.example` 생성

## Group 2: Tests

### 2-1. API 라우트 통합 테스트
```
방법: createApp() + app.request() + in-memory SQLite
파일: tests/api-routes.test.ts (주요 엔드포인트 집중)
범위: agents CRUD, analytics, marketplace, tenants, system
인증: X-API-Key 헤더 or dev mode fallback
```

### 2-2. Auth 미들웨어 테스트
```
범위: API key 유효/무효, RBAC (admin/operator/viewer), Bearer 토큰, public path 우회
파일: tests/auth-middleware.test.ts
```

### 2-3. E2E 테스트 (Playwright)
```
범위: 로그인 → 대시보드 → 에이전트 목록 → 설정
파일: e2e/smoke.spec.ts, playwright.config.ts
의존성: @playwright/test
```

## Group 3: DevOps

### 3-1. Docker
```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
# pnpm install + turbo build
FROM node:20-alpine AS runner
# Copy dist + node_modules + sqlite data volume
EXPOSE 3456
CMD ["node", "apps/api/dist/index.js"]
```
- `docker-compose.yml`: single service, volume for data, port mapping

### 3-2. GitHub Actions CI
```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps: checkout → pnpm install → turbo build → vitest run
```

### 3-3. 환경별 설정
- NODE_ENV 기반 분기를 `packages/shared/src/env.ts`에 통합

## Group 4: UX & API

### 4-1. 글로벌 에러 토스트
```
컴포넌트: Toast (fixed bottom-right, auto-dismiss 5s)
API wrapper: apiFetch() — response.ok 아니면 toast 자동 표시
전역 상태: Zustand toast store (message, type, show/hide)
```

### 4-2. 페이지네이션
```
API: ?limit=20&offset=0 → { data: T[], total: number }
컴포넌트: <Pagination page={n} total={t} onPageChange={fn} />
적용: agents, notifications, marketplace
```

### 4-3. WebSocket 강화
```
Heartbeat: 30초마다 ping, 5초 내 pong 없으면 reconnect
재연결: exponential backoff (1s → 2s → 4s → max 30s)
이벤트: agent:log 추가 (실시간 로그 스트리밍)
```

### 4-4. OpenAPI 스펙
```
@hono/swagger-ui + @hono/zod-openapi (또는 수동 JSON spec)
경로: GET /api/docs → Swagger UI
```
