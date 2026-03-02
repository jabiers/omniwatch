# OmniWatch v4.24 Plan — Test Coverage Expansion + Polling Constant

## Goal

Add tests for 10 untested API routes and extract hardcoded 30-second polling interval to a shared constant.

## Scope

### TEST: 10 untested routes
- GET /analytics/anomalies
- GET /security/events
- PUT /tenants/:id
- POST /users/:id/rotate-key
- POST /marketplace (publish)
- POST /marketplace/:id/install
- POST /recipes/:id/install
- GET /system/health/detailed
- POST /agents/:id/snapshots
- POST /agents/:id/snapshots/:seq/restore

### CONST: Polling interval constant
- Add `DASHBOARD_POLL_INTERVAL = 30_000` to packages/shared/src/constants.ts
- Replace hardcoded 30000/30_000 in 6 web pages: page.tsx, agents/page.tsx, mesh/page.tsx, notifications/page.tsx, queue/page.tsx, analytics/page.tsx

## Files

- `tests/api-routes.test.ts` — 10+ new test cases
- `packages/shared/src/constants.ts` — DASHBOARD_POLL_INTERVAL constant
- `packages/shared/src/index.ts` — Export new constant
- `apps/web/src/app/page.tsx` — Use constant
- `apps/web/src/app/agents/page.tsx` — Use constant
- `apps/web/src/app/mesh/page.tsx` — Use constant
- `apps/web/src/app/notifications/page.tsx` — Use constant
- `apps/web/src/app/queue/page.tsx` — Use constant
- `apps/web/src/app/analytics/page.tsx` — Use constant

## Success Criteria

- 10+ new API route tests pass
- Zero hardcoded 30000/30_000 polling values in web pages
- Build passes
- All tests pass
