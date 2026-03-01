# Vigil v1.1 Design — Quality & Security Hardening

## 1. Overview

v1.1은 기능 추가가 아닌 **품질 인프라 + 보안 강화 + DX 개선**에 집중한다. ESLint 에러/경고를 완전 제거하고, API 보안 미비점(CORS wildcard, rate limit 미적용, 보안 헤더 누락)을 해결하며, Husky/commitlint로 개발 워크플로우를 자동화한다.

### Scope
- 14개 작업, 4개 그룹
- 기능 변경 없음 (non-breaking)
- 인프라성 개선만 포함

### Architecture Impact

```
┌─────────────────────────────────────────────────────────────┐
│                     Before (v1.0)                           │
├─────────────────────────────────────────────────────────────┤
│  CORS: wildcard (*)                                         │
│  Rate Limit: none                                           │
│  Security Headers: none                                     │
│  Error Handler: simple console.error                        │
│  CI: build + test only                                      │
│  Git Hooks: none                                            │
│  Coverage: not tracked                                      │
│  Env Validation: manual getEnvConfig()                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                     After (v1.1)                            │
├─────────────────────────────────────────────────────────────┤
│  CORS: env-based whitelist                                  │
│  Rate Limit: 100 req/min/IP                                 │
│  Security Headers: 6 headers (HSTS, X-Frame, CSP, etc.)    │
│  Error Handler: structured JSON + correlation ID            │
│  CI: build + test + lint + coverage + Docker build          │
│  Git Hooks: Husky (lint-staged + commitlint)                │
│  Coverage: v8, threshold 70%                                │
│  Env Validation: Zod schema                                 │
│  Error Boundary: React ErrorBoundary in dashboard           │
└─────────────────────────────────────────────────────────────┘
```

### Middleware Stack (After v1.1)

```
Request
  │
  ├─ correlationId()         ← NEW: X-Request-ID 생성/전파
  ├─ securityHeaders()       ← NEW: 6개 보안 헤더
  ├─ cors({ origin: ... })   ← UPGRADED: whitelist 기반
  ├─ rateLimiter()           ← NEW: 100 req/min/IP
  ├─ requestLogger           ← EXISTING
  ├─ authMiddleware          ← EXISTING (for /api/* only)
  │
  └─ Route Handler
       │
       └─ onError(errorHandler)  ← UPGRADED: structured JSON + requestId
```

---

## 2. Group 1: Code Quality Gate

### 2-1. ESLint Error Fixes

**Target files & rules:**

#### `apps/daemon/src/chat-handler.ts:39` — `no-useless-assignment`

현재 코드 (line 38-44):
```typescript
let currentCode = '';
try {
  currentCode = readFileSync(codePath, 'utf-8');
} catch {
  currentCode = '// No code file found';
}
```

`currentCode`에 `''`을 할당한 뒤 즉시 try/catch에서 재할당하므로 초기 할당이 무의미하다.

수정:
```typescript
let currentCode: string;
try {
  currentCode = readFileSync(codePath, 'utf-8');
} catch {
  currentCode = '// No code file found';
}
```

#### `apps/daemon/src/code-generator.ts:90` — `preserve-caught-error`

현재 코드 (line 88-91):
```typescript
} catch (err) {
  log('error', `Failed to parse generated code: ${err}`);
  throw new Error(`Failed to parse AI response: ${err}`);
}
```

`throw new Error(...)` 시 원래 에러의 스택이 소실된다.

수정:
```typescript
} catch (err) {
  log('error', `Failed to parse generated code: ${err}`);
  throw new Error(`Failed to parse AI response`, { cause: err });
}
```

### 2-2. ESLint Warning Resolution

전략:
- **미사용 변수**: 필요 시 `_` prefix 추가, 불필요 시 제거
- **미사용 import**: 완전 제거
- **미사용 함수 파라미터**: `_` prefix (`(_req, res)` 등)

ESLint config (`eslint.config.js`)에 이미 `argsIgnorePattern: '^_'` 설정이 있으므로 `_` prefix만 붙이면 경고가 해소된다.

### 2-3. CI Lint Step

현재 CI (`/.github/workflows/ci.yml`):
```yaml
steps:
  - uses: actions/checkout@v4
  - uses: pnpm/action-setup@v4
  - uses: actions/setup-node@v4
  - run: pnpm install --frozen-lockfile
  - run: npx turbo build
  - run: npx vitest run
```

변경 후:
```yaml
steps:
  - uses: actions/checkout@v4
  - uses: pnpm/action-setup@v4
    with:
      version: 10
  - uses: actions/setup-node@v4
    with:
      node-version: 20
      cache: pnpm
  - run: pnpm install --frozen-lockfile
  - name: Lint
    run: pnpm lint
  - name: Build
    run: pnpm build
  - name: Test
    run: pnpm test
```

root `package.json`의 `"lint": "turbo lint"` 스크립트가 이미 존재한다. 각 app/package의 `package.json`에 `"lint": "eslint ."` 스크립트가 필요하면 추가한다.

### 2-4. Vitest Coverage

현재 `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@vigil/shared': resolve(__dirname, 'packages/shared/src/index.ts'),
      '@vigil/db': resolve(__dirname, 'packages/db/src/index.ts'),
    },
  },
});
```

변경 후:
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['apps/*/src/**/*.ts', 'packages/*/src/**/*.ts'],
      exclude: [
        '**/dist/**',
        '**/node_modules/**',
        '**/*.test.ts',
        '**/*.d.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@vigil/shared': resolve(__dirname, 'packages/shared/src/index.ts'),
      '@vigil/db': resolve(__dirname, 'packages/db/src/index.ts'),
    },
  },
});
```

devDependencies 추가:
```json
"@vitest/coverage-v8": "^2.1.0"
```

vitest 버전과 일치시킨다 (현재 `"vitest": "^2.1.0"`).

---

## 3. Group 2: Security Hardening

### 3-1. CORS Whitelist

현재 `apps/api/src/app.ts`:
```typescript
app.use('*', cors());  // wildcard — 모든 origin 허용
```

변경 후:
```typescript
import { cors } from 'hono/cors';
import { getEnvConfig } from '@vigil/shared';

app.use('*', cors({
  origin: (origin) => {
    const config = getEnvConfig();
    const allowed = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3457'];
    return allowed.includes(origin) ? origin : null;
  },
  credentials: true,
}));
```

`cors()` import은 이미 존재하고 사용 중이므로 인자만 추가한다.

`.env.example`에 추가:
```bash
# ─── Security ────────────────────────────────────────────────────────────────

# Comma-separated list of allowed CORS origins (default: http://localhost:3457)
# CORS_ORIGINS=http://localhost:3457,https://your-domain.com
```

### 3-2. Rate Limiting

Hono에는 빌트인 rate limiter가 없다. 간단한 인메모리 슬라이딩 윈도우 구현으로 해결한다.

새 파일: `apps/api/src/middleware/rate-limit.ts`
```typescript
import type { MiddlewareHandler } from 'hono';

/** In-memory sliding window rate limiter */
const store = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 100;

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60_000);

/**
 * Rate limiting middleware.
 * Limits to MAX_REQUESTS per WINDOW_MS per IP.
 * Returns 429 Too Many Requests when exceeded.
 */
export function rateLimiter(): MiddlewareHandler {
  return async (c, next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      || c.req.header('x-real-ip')
      || 'unknown';
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    } else if (entry.count >= MAX_REQUESTS) {
      c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return c.json({ error: 'Too Many Requests' }, 429);
    } else {
      entry.count++;
    }

    await next();
  };
}
```

적용 위치 (`app.ts`):
```typescript
app.use('*', correlationId());     // 1st
app.use('*', securityHeaders());   // 2nd
app.use('*', cors({ ... }));       // 3rd
app.use('*', rateLimiter());       // 4th — CORS 이후, auth 이전
app.use('*', requestLogger);       // 5th
app.use('/api/*', authMiddleware); // 6th
```

### 3-3. Security Headers

새 파일: `apps/api/src/middleware/security-headers.ts`
```typescript
import type { MiddlewareHandler } from 'hono';

/**
 * Security headers middleware.
 * Adds standard security headers to all responses.
 */
export function securityHeaders(): MiddlewareHandler {
  return async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  };
}
```

### 3-4. Environment Variable Zod Validation

현재 `packages/shared/src/env.ts`에는 `getEnvConfig()`과 `validateEnv()`가 있다. Zod 기반 스키마로 강화한다.

변경 후 (`packages/shared/src/env.ts`):
```typescript
import { z } from 'zod';

/**
 * Zod schema for validated environment configuration.
 * Provides type-safe access with coercion and defaults.
 */
const envSchema = z.object({
  // Core
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  OMNI_DATA_DIR: z.string().default(''),
  PORT: z.coerce.number().default(3456),

  // Security
  CORS_ORIGINS: z.string().optional(),

  // AI Providers
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OLLAMA_URL: z.string().url().optional(),

  // OAuth - GitHub
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_REDIRECT_URI: z.string().url().optional(),

  // OAuth - Google
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),

  // Notifications
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  DISCORD_WEBHOOK_URL: z.string().url().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

/** Cached validated env to avoid re-parsing */
let _cachedEnv: EnvConfig | null = null;

/**
 * Parse and validate environment variables with Zod.
 * Returns typed config with defaults applied.
 * Throws ZodError on invalid required fields.
 */
export function getValidatedEnv(): EnvConfig {
  if (_cachedEnv) return _cachedEnv;
  _cachedEnv = envSchema.parse(process.env);
  return _cachedEnv;
}

/** Reset cached env (for testing) */
export function resetEnvCache(): void {
  _cachedEnv = null;
}

/**
 * Legacy compat — delegates to Zod-validated version.
 * Existing callers of getEnvConfig() continue to work.
 */
export function getEnvConfig() {
  const env = getValidatedEnv();
  return {
    nodeEnv: env.NODE_ENV,
    isDev: env.NODE_ENV !== 'production',
    isProd: env.NODE_ENV === 'production',
    dataDir: env.OMNI_DATA_DIR,
    port: env.PORT,
  };
}

/**
 * Validate environment variables at startup.
 * Now delegates to Zod — logs missing optional AI/notification vars.
 */
export function validateEnv(): void {
  const env = getValidatedEnv();
  const missingOptional: string[] = [];

  const optionalKeys = [
    'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'OLLAMA_URL',
    'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET',
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
    'SLACK_WEBHOOK_URL', 'DISCORD_WEBHOOK_URL',
    'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID',
  ] as const;

  for (const key of optionalKeys) {
    if (!env[key]) missingOptional.push(key);
  }

  if (missingOptional.length > 0) {
    console.warn(`[vigil] Missing optional env vars: ${missingOptional.join(', ')}`);
  }
}
```

`zod`는 `packages/shared/package.json`의 dependencies에 추가:
```json
"zod": "^3.23.0"
```

---

## 4. Group 3: DX & Git Workflow

### 4-1. Husky + lint-staged

root `package.json` devDependencies 추가:
```json
"husky": "^9.0.0",
"lint-staged": "^15.0.0"
```

root `package.json` scripts 추가:
```json
"prepare": "husky"
```

root `package.json` lint-staged config 추가:
```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,yml}": ["prettier --write"]
}
```

`.husky/pre-commit` 생성:
```bash
pnpm lint-staged
```

### 4-2. commitlint

root `package.json` devDependencies 추가:
```json
"@commitlint/cli": "^19.0.0",
"@commitlint/config-conventional": "^19.0.0"
```

`commitlint.config.js` 생성:
```javascript
export default { extends: ['@commitlint/config-conventional'] };
```

`.husky/commit-msg` 생성:
```bash
pnpm commitlint --edit $1
```

### 4-3. CI Extension

`.github/workflows/ci.yml` 확장:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Build
        run: pnpm build

      - name: Test with coverage
        run: pnpm test -- --coverage

      - name: Docker build test (API)
        run: docker build --target api -t vigil-api:test .

      - name: Docker build test (Web)
        run: docker build --target web -t vigil-web:test .
```

---

## 5. Group 4: Error Handling & Logging

### 5-1. React Error Boundary

현재 `apps/web/src/components/`에 Error Boundary가 없다.

새 파일: `apps/web/src/components/error-boundary.tsx`
```tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary for catching render errors.
 * Displays a recovery UI instead of a blank screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h2>
          <p className="text-zinc-400 mb-6 max-w-md">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

`apps/web/src/app/layout.tsx` 적용 위치:
```tsx
// layout.tsx — children을 ErrorBoundary로 감싸기
import { ErrorBoundary } from '../components/error-boundary';

// AppShell 내부 main 태그에서:
<main className="flex-1 p-6">
  <ErrorBoundary>{children}</ErrorBoundary>
</main>
```

### 5-2. Correlation ID Middleware

새 파일: `apps/api/src/middleware/correlation-id.ts`
```typescript
import type { MiddlewareHandler } from 'hono';
import { nanoid } from 'nanoid';

// Extend Hono context type
declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
  }
}

/**
 * Correlation ID middleware.
 * Propagates X-Request-ID from upstream or generates a new one.
 * Stored in context as 'requestId' for downstream use.
 */
export function correlationId(): MiddlewareHandler {
  return async (c, next) => {
    const id = c.req.header('x-request-id') || nanoid(12);
    c.set('requestId', id);
    await next();
    c.header('X-Request-ID', id);
  };
}
```

`nanoid`는 이미 root `package.json`의 devDependencies에 존재 (`"nanoid": "^5.0.9"`). `apps/api/package.json`의 dependencies에도 추가한다.

### 5-3. Enhanced Error Handler

현재 `apps/api/src/middleware/error-handler.ts`:
```typescript
export const errorHandler: ErrorHandler = (err, c) => {
  console.error('[API Error]', err.message);
  const status = 'status' in err && typeof err.status === 'number' ? err.status : 500;
  return c.json({ error: err.message }, status as any);
};
```

변경 후:
```typescript
import type { ErrorHandler } from 'hono';
import type { HTTPException } from 'hono/http-exception';

/**
 * Structured error handler with correlation ID and JSON logging.
 * Outputs machine-parsable error logs for observability.
 */
export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.get('requestId') || 'unknown';
  const status = 'status' in err && typeof err.status === 'number' ? err.status : 500;

  // Structured JSON log for observability
  console.error(JSON.stringify({
    level: 'error',
    requestId,
    status,
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    path: c.req.path,
    method: c.req.method,
    timestamp: new Date().toISOString(),
  }));

  return c.json({
    error: err.message,
    requestId,
    code: status,
  }, status as any);
};
```

---

## 6. File Change Summary

### New Files (5)
| File | Purpose |
|------|---------|
| `apps/api/src/middleware/rate-limit.ts` | In-memory rate limiter (100 req/min/IP) |
| `apps/api/src/middleware/security-headers.ts` | 6 security response headers |
| `apps/api/src/middleware/correlation-id.ts` | X-Request-ID propagation |
| `apps/web/src/components/error-boundary.tsx` | React Error Boundary |
| `commitlint.config.js` | Conventional Commits enforcement |

### Modified Files (10)
| File | Change |
|------|--------|
| `apps/daemon/src/chat-handler.ts` | Fix no-useless-assignment |
| `apps/daemon/src/code-generator.ts` | Fix preserve-caught-error with `{ cause }` |
| `apps/api/src/app.ts` | Add middleware stack (correlation, security, rate-limit, CORS whitelist) |
| `apps/api/src/middleware/error-handler.ts` | Structured JSON logging + requestId |
| `apps/web/src/app/layout.tsx` | Wrap children with ErrorBoundary |
| `packages/shared/src/env.ts` | Zod validation schema |
| `vitest.config.ts` | v8 coverage provider + thresholds |
| `.github/workflows/ci.yml` | Add lint, coverage, Docker build steps |
| `.env.example` | Add CORS_ORIGINS |
| `package.json` | Add husky, lint-staged, commitlint, coverage deps, prepare script |

### New Config Files (2)
| File | Purpose |
|------|--------|
| `.husky/pre-commit` | lint-staged hook |
| `.husky/commit-msg` | commitlint hook |

---

## 7. Dependency Changes

### Root `package.json` devDependencies
```json
"@commitlint/cli": "^19.0.0",
"@commitlint/config-conventional": "^19.0.0",
"@vitest/coverage-v8": "^2.1.0",
"husky": "^9.0.0",
"lint-staged": "^15.0.0"
```

### `packages/shared/package.json` dependencies
```json
"zod": "^3.23.0"
```

### `apps/api/package.json` dependencies
```json
"nanoid": "^5.0.9"
```

---

## 8. Updated `apps/api/src/app.ts`

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { correlationId } from './middleware/correlation-id.js';
import { securityHeaders } from './middleware/security-headers.js';
import { rateLimiter } from './middleware/rate-limit.js';
import { requestLogger } from './middleware/logger.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
// ... route imports unchanged ...
import { registerOpenAPI } from './openapi.js';

export function createApp(): Hono {
  const app = new Hono();

  // Middleware stack (order matters)
  app.use('*', correlationId());
  app.use('*', securityHeaders());
  app.use('*', cors({
    origin: (origin) => {
      const allowed = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3457'];
      return allowed.includes(origin) ? origin : null;
    },
    credentials: true,
  }));
  app.use('*', rateLimiter());
  app.use('*', requestLogger);
  app.use('/api/*', authMiddleware);
  app.onError(errorHandler);

  // OAuth routes (no auth required)
  app.route('/', oauthRoutes);

  // Mount route groups
  app.route('/api', agentRoutes);
  // ... remaining routes unchanged ...

  app.get('/health', (c) =>
    c.json({ status: 'ok', timestamp: new Date().toISOString() }),
  );

  registerOpenAPI(app);
  return app;
}
```

---

## 9. Implementation Order

1. **Group 1-1, 1-2**: ESLint 에러/경고 수정 (코드 변경)
2. **Group 2-4**: Zod env validation (`packages/shared` 먼저 — 다른 패키지에서 참조)
3. **Group 2-1, 2-2, 2-3**: CORS + Rate limit + Security headers (새 미들웨어)
4. **Group 4-2, 4-3**: Correlation ID + Error handler (미들웨어 연관)
5. **Group 4-1**: Error Boundary (독립적)
6. **Group 1-4**: Vitest coverage 설정
7. **Group 3-1, 3-2**: Husky + commitlint (DX)
8. **Group 1-3, 3-3**: CI 확장
9. **Verification**: 전체 lint + test + coverage 확인

---

## 10. Success Criteria

| Criteria | Measurement |
|----------|-------------|
| ESLint clean | `pnpm lint` — 0 errors, 0 warnings |
| CI pipeline | build + test + lint + coverage 모두 green |
| CORS restricted | Non-whitelisted origin에서 403 확인 |
| Rate limit active | 101번째 요청에서 429 반환 |
| Security headers | `curl -I` 로 6개 헤더 존재 확인 |
| Env validation | 잘못된 PORT 값으로 시작 시 ZodError throw |
| Coverage threshold | `pnpm test -- --coverage` — lines/functions >= 70% |
| Husky hooks | 커밋 시 lint-staged + commitlint 자동 실행 |
| Error Boundary | 대시보드에서 render error 발생 시 복구 UI 표시 |
| Correlation ID | API 응답에 `X-Request-ID` 헤더 포함 |
| Structured errors | 에러 응답에 `{ error, requestId, code }` 포맷 |
