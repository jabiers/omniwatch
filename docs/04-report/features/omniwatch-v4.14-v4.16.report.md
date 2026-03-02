# OmniWatch v4.14-v4.16 Completion Report

## Summary

Three bug-fix releases addressing API parameter handling and frontend-backend data format mismatches. v4.14 fixes the analytics `hours` query parameter being ignored. v4.15 adds proper pagination (limit/offset) to agents and notifications endpoints. v4.16 fixes alert rule operator mapping and notify_channels type mismatch between the frontend and API.

## Changes by Version

### v4.14 — Analytics hours parameter

The frontend was sending `hours` as a query parameter to the analytics metrics endpoint, but the route handler ignored it entirely. The fix involved three layers:

1. Added `hours` to the Zod `metricsQuerySchema` for validation
2. Updated the route handler to destructure and forward `hours` to the engine
3. Updated the engine handler to use `hours` as `limit` when provided, falling back to the existing `limit` param

**Files:**
- `apps/api/src/routes/analytics.ts`
- `apps/api/src/engine/handlers/analytics.ts`

### v4.15 — Pagination support (limit/offset)

GET /agents had no pagination at all, returning every agent on every request. GET /notifications had `limit` but no `offset` support, making it impossible to paginate beyond the first page.

1. Added `limit` (max 500, default 100) and `offset` (default 0) to agents query schema
2. Added `offset` (default 0) to notifications query schema
3. Updated both SQL queries with `LIMIT ? OFFSET ?` parameterized clauses

**Files:**
- `apps/api/src/routes/agents.ts`
- `apps/api/src/routes/notifications.ts`

### v4.16 — Alert form fixes

Two data format mismatches between the analytics page and the alert rules API:

1. **Operator mapping**: The UI used display symbols (`>`, `<`, `>=`, `<=`) but the API Zod schema expected enum values (`gt`, `lt`, `gte`, `lte`). Added `operatorMap` for submit and `reverseOp` for edit form population.
2. **notify_channels type**: The frontend was sending `JSON.stringify(array)` (a string) but the API expected `z.array(z.string())` (a native array). Changed to send the array directly.

**Files:**
- `apps/web/src/app/analytics/page.tsx`

## Test Results

- Root: 405 passed
- Web: 121 passed
- **Total: 526 passed**
- Build: all 5 packages successful

## PDCA Metrics

| Version | Match Rate | Iterations |
|---------|-----------|------------|
| v4.14   | 100%      | 0          |
| v4.15   | 100%      | 0          |
| v4.16   | 100%      | 0          |
