# Vigil v1.2 Design — Testing, Observability & Documentation

## Group 1: Web Testing Foundation

### 1-1. Testing Environment Setup
apps/web/package.json devDependencies 추가:
```json
"@testing-library/react": "^16.0.0",
"@testing-library/jest-dom": "^6.0.0",
"jsdom": "^25.0.0",
"vitest": "^2.1.0"
```

apps/web/vitest.config.ts 생성:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

apps/web/src/__tests__/setup.ts:
```ts
import '@testing-library/jest-dom/vitest';
```

apps/web/package.json scripts:
```json
"test": "vitest run"
```

### 1-2. Utility Tests (9개+)
apps/web/src/__tests__/lib/ 디렉토리:

**auth-store.test.ts** (4개):
- setAuth stores credentials
- clearAuth removes credentials
- isAuthenticated returns correct state
- getAuthHeaders returns X-API-Key header

**toast-store.test.ts** (3개):
- addToast adds to list
- removeToast removes by id
- auto-dismiss after timeout

**api.test.ts** (2개+):
- apiFetch attaches API key header
- apiFetch shows toast on error response

### 1-3. Component Tests (8개+)
apps/web/src/__tests__/components/ 디렉토리:

**pagination.test.tsx** (3개):
- renders page info
- prev disabled on first page
- next disabled on last page

**toast.test.tsx** (2개):
- renders toast messages
- removes toast on dismiss

**error-boundary.test.tsx** (2개):
- renders children normally
- shows error UI on throw

**auth-guard.test.tsx** (1개):
- redirects unauthenticated to /login

### 1-4. Page Tests (6개+)
apps/web/src/__tests__/pages/ 디렉토리:

**login.test.tsx** (2개):
- renders login form
- shows error on empty submit

**agents.test.tsx** (2개):
- renders agent list heading
- shows create button

**dashboard.test.tsx** (2개):
- renders dashboard heading
- shows stat cards

## Group 2: Observability

### 2-1. Detailed Health Check
apps/api/src/routes/system.ts에 추가 (또는 app.ts에 직접):
```ts
app.get('/health/detailed', async (c) => {
  const db = getDb();
  let dbOk = false;
  try { db.prepare('SELECT 1').get(); dbOk = true; } catch {}
  const mem = process.memoryUsage();
  return c.json({
    status: dbOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.2.0',
    checks: {
      database: { status: dbOk ? 'up' : 'down' },
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      },
    },
  });
});
```

### 2-2. Version Sync
apps/web/src/app/layout.tsx에서 하드코딩 v0.7.0 제거:
```tsx
// 기존: v0.7.0
// 변경: process.env.NEXT_PUBLIC_APP_VERSION || 'dev'
```
apps/web/next.config.ts에 env 주입:
```ts
env: { NEXT_PUBLIC_APP_VERSION: '1.2.0' },
```

### 2-3. OpenAPI Version Sync
apps/api/src/openapi.ts info.version: '0.8.0' → '1.2.0'

## Group 3: Documentation

### 3-1. CONTRIBUTING.md
루트에 CONTRIBUTING.md 생성:
- Prerequisites (Node 20+, pnpm)
- Development Setup (clone, install, build, dev)
- Project Structure (monorepo 6 packages)
- Commit Convention (conventional commits with commitlint)
- PR Process
- Testing (vitest run)
- Code Style (ESLint + Prettier)

### 3-2. OpenAPI Schema Enhancement
apps/api/src/openapi.ts의 모든 엔드포인트에 request/response schema 추가.
특히 빈 `{ type: 'object' }` 를 구체적인 properties로 교체.
주요 스키마:
- Agent: { id, name, status, prompt, model, ... }
- Notification: { id, type, message, read, ... }
- Recipe: { id, name, description, template, ... }
- Analytics: { metric_name, avg_value, timestamp, ... }

## Group 4: Accessibility Basics

### 4-1. Form Accessibility
모든 `<input>`, `<select>`, `<textarea>`에 id + label 연결:
```tsx
<label htmlFor="agentName" className="...">Agent Name</label>
<input id="agentName" ... />
```
대상 페이지: login, agents/new, settings, tenants, marketplace, analytics, notifications

### 4-2. Button/Icon aria-label
사이드바, 헤더, 액션 버튼에 aria-label 추가:
```tsx
<button aria-label="Open sidebar menu" ...>
<button aria-label="Previous page" ...>  // Pagination
<button aria-label="Close notification" ...>
```

### 4-3. Table/List aria
에이전트 목록, 큐, 메시 등 테이블에:
```tsx
<table role="table" aria-label="Agent list">
  <thead><tr role="row">...
```
