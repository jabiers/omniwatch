# Vigil v1.3 Design - Version Sync & Developer Experience

## Group 1: Version Sync

### 1-1. Centralize version
- Update root `package.json` version to `1.3.0`
- Update all 6 sub-package `package.json` versions to `1.3.0`

### 1-2. Build-time version injection
- **next.config.ts**: Read version from `../../package.json` instead of hardcoded string
- **openapi.ts**: Import version from root package.json, use in spec.info.version
- **system.ts**: Import version from root package.json for /health/detailed

### 1-3. Version sync script
- Add `scripts/sync-version.mjs` that reads root version and writes to all sub-packages
- Add `"version:sync": "node scripts/sync-version.mjs"` to root package.json

## Group 2: WebSocket Status UI

### 2-1. Global WS status store
- Create `apps/web/src/lib/ws-store.ts` using zustand-like pattern (simple module state)
- Export: `wsStatus` state ('connected' | 'reconnecting' | 'disconnected')
- Integrate with existing `useWebSocket` hook - update global status on connect/disconnect

### 2-2. Layout status indicator
- Modify sidebar bottom section in `layout.tsx`
- Replace hardcoded "Daemon Connected" with dynamic status:
  - Connected: green pulse dot + "Connected"
  - Reconnecting: yellow pulse dot + "Reconnecting..."
  - Disconnected: red dot + "Disconnected"

## Group 3: Developer Experience

### 3-1. Bundle analyzer
- Install `@next/bundle-analyzer`
- Wrap nextConfig in `withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })`

### 3-2. Configurable log level
- Read `LOG_LEVEL` env in `initLogger` as fallback
- Update `packages/shared/src/logger.ts`:
  ```ts
  const envLevel = process.env.LOG_LEVEL as LogLevel | undefined;
  let minLevel: LogLevel = envLevel && LEVEL_PRIORITY[envLevel] !== undefined ? envLevel : 'info';
  ```

### 3-3. E2E API tests
- Create `tests/e2e/api.test.ts`
- Test endpoints:
  1. GET /health → 200 + status ok
  2. GET /api/system/health/detailed → 200 + version field
  3. GET /api/agents → 401 without key
  4. GET /api/docs/spec → 200 + openapi field
  5. GET /api/system/status → 200 + agentCount field
- Use vitest + native fetch (no extra deps)
- Add `"test:e2e": "vitest run --config vitest.e2e.config.ts"` to root
