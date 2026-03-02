# OmniWatch v4.24 Completion Report

## Summary

Test coverage expansion (+17 API route tests) and polling constant extraction from 6 web pages.

## Version

| Version | Focus | Match Rate |
|---------|-------|:----------:|
| v4.24 | Test coverage + polling constant | 100% |

## Changes

### CONST: Polling Interval Extraction
- Added `DASHBOARD_POLL_INTERVAL = 30_000` to `packages/shared/src/constants.ts`
- Exported from `packages/shared/src/index.ts`
- Created `apps/web/src/lib/constants.ts` for client-safe re-export (shared package includes Node.js modules incompatible with webpack client bundling)
- Replaced hardcoded 30000/30_000 in 6 web pages:
  - `page.tsx` — Dashboard
  - `agents/page.tsx` — Agent list
  - `mesh/page.tsx` — Agent mesh
  - `notifications/page.tsx` — Notification list
  - `queue/page.tsx` — Message queue
  - `analytics/page.tsx` — Analytics dashboard

### TEST: 17 New API Route Tests
| Route | Tests | Description |
|-------|:-----:|-------------|
| GET /analytics/anomalies | 2 | Default + agentId filter |
| GET /security/events | 2 | Default + limit param |
| PUT /tenants/:id | 2 | 404 not found + 200 update |
| POST /users/:id/rotate-key | 2 | 404 not found + 200 rotate |
| POST /marketplace (publish) | 2 | 400 validation + 201 create |
| POST /marketplace/:id/install | 2 | 404 not found + 201 install |
| POST /recipes/:id/install | 2 | 404 not found + engine check |
| GET /system/health/detailed | 1 | 200 healthy with checks |
| POST /agents/:id/snapshots | 2 | 404 + 201 capture |
| POST /agents/:id/snapshots/:seq/restore | 2 | 404 + 200 restore |
| **Total** | **17** | |

### FIX: Rate Limiter in Tests
- Added rate limiter mock to prevent 429 responses when test suite exceeds 100 requests

## Files Modified (11 unique)

| File | Change |
|------|--------|
| `packages/shared/src/constants.ts` | DASHBOARD_POLL_INTERVAL constant |
| `packages/shared/src/index.ts` | Export new constant |
| `apps/web/src/lib/constants.ts` | New: client-safe constant re-export |
| `apps/web/src/app/page.tsx` | Use constant |
| `apps/web/src/app/agents/page.tsx` | Use constant |
| `apps/web/src/app/mesh/page.tsx` | Use constant |
| `apps/web/src/app/notifications/page.tsx` | Use constant |
| `apps/web/src/app/queue/page.tsx` | Use constant |
| `apps/web/src/app/analytics/page.tsx` | Use constant |
| `tests/api-routes.test.ts` | +17 tests, rate limiter mock |
| `README.md` / `README.ko.md` | Stats sync |

## Test Results

- Root: 432 passed (+17 from v4.23)
- Web: 121 passed
- Total: **553 passed**
- Build: All 5 packages successful
