# OmniWatch v4.18-v4.20 Completion Report

## Summary

Three security and resilience releases. v4.18 adds Zod parameter validation and tenant isolation to chat and snapshot routes. v4.19 fixes tenant PUT response wrapping inconsistency and adds a missing role guard on recipe install. v4.20 adds user-visible error handling for analytics partial API failures.

## Changes by Version

### v4.18 — Chat/Snapshot Zod Param Validation + Tenant Isolation

Chat routes lacked parameter validation and tenant isolation, meaning any authenticated user could potentially interact with agents belonging to other tenants. Snapshot routes lacked Zod validation on the `:id` parameter.

1. **chat.ts**: Added `agentIdParam` Zod schema for `:id` validation. Created `verifyAgentAccess()` function that loads the agent and verifies `tenant_id` matches the requesting tenant. Applied to `/agents/:id/chat` and `/agents/:id/apply`. Added `requireRole('admin', 'operator')` to all chat routes.
2. **snapshots.ts**: Added `agentIdParam` Zod validation to GET `/agents/:id/snapshots`, POST `/agents/:id/snapshots`, and GET `/agents/:id/children`.
3. **tests**: Updated chat/apply test mocks with `mockGet.mockReturnValueOnce({id: 'agent-1', tenant_id: 'default'})` to satisfy the new tenant isolation checks.

**Files:**
- `apps/api/src/routes/chat.ts`
- `apps/api/src/routes/snapshots.ts`
- `tests/api-routes.test.ts`

### v4.19 — Tenant PUT Response Wrapping + Recipe Install Auth

Two API consistency fixes:

1. **Response wrapping**: PUT /tenants/:id returned a bare tenant object (`c.json(tenant)`) while other tenant endpoints wrapped it in `{ tenant }`. Changed to `c.json({ tenant })` for consistency.
2. **Role guard**: POST /recipes/:id/install had no role restriction, allowing viewer-role users to create agents via recipe installation. Added `requireRole('admin', 'operator')` middleware.

**Files:**
- `apps/api/src/routes/tenants.ts`
- `apps/api/src/routes/recipes.ts`

### v4.20 — Analytics Partial Failure Error Handling

The analytics page used `Promise.allSettled()` for multiple concurrent API calls but silently swallowed failures, showing empty charts with no user feedback. Added `failCount` detection after settlement:

1. **All requests fail**: Shows an error state to the user
2. **Some requests fail** (partial failure): Shows a warning indicating incomplete data
3. **All requests succeed**: No change to existing behavior

**Files:**
- `apps/web/src/app/analytics/page.tsx`

## Test Results

- Root: 405 passed
- Web: 121 passed
- **Total: 526 passed**
- CI: All steps passed (install/build/lint/test/Docker)

## PDCA Metrics

| Version | Match Rate | Iterations |
|---------|-----------|------------|
| v4.18   | 100%      | 0          |
| v4.19   | 100%      | 0          |
| v4.20   | 100%      | 0          |
