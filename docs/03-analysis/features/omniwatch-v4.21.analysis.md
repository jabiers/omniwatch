# OmniWatch v4.21 Gap Analysis

## Match Rate: 100%

## Changes

| Item | Plan | Implementation | Status |
|------|------|---------------|--------|
| BUG-1: Agent creation tenant_id | `createAgentRecord()` INSERT tenant_id; handler passes tenantId | `tenant_id` column in INSERT (agent-manager.ts:78); `tenantId` propagated handler→route→createAgentRecord | Done |
| SEC-1: DELETE/start/stop/restart tenant check | `verifyAgentTenant()` before mutations | `verifyAgentTenant()` applied on all 4 routes (agents.ts:147,166,185,204) | Done |
| SEC-2: MCP auth + tenant filter | Remove MCP from PUBLIC_PATHS; apply tenantFilter/isAgentAccessible | `/api/mcp` absent from PUBLIC_PATHS; `currentAuth` propagated; `tenantFilter()` and `isAgentAccessible()` applied to all tools/resources | Done |
| SEC-3: Analytics metrics agentId tenant check | Verify agent belongs to caller's tenant | Non-admin check added in GET /analytics/metrics (analytics.ts:67-75) | Done |
| SEC-4: Alert PUT/DELETE tenant check | tenant_id WHERE clause in update/delete | `updateAlertRule`/`deleteAlertRule` ownership checks (anomaly-detector.ts:193,217-222); routes pass `tenantId: auth.tenantId` | Done |
| SEC-5: PUT /config requireRole('admin') | Add requireRole('admin') to PUT | `requireRole('admin')` on PUT /config (config.ts:104-106) | Done |
| SPEC-1: OpenAPI alerts key 'rules' | Change `{ alerts }` to `{ rules }` | OpenAPI response uses `rules` key (openapi.ts:605) | Done |
| SPEC-2: OpenAPI PUT /tenants response | Change `{ ok }` to `{ tenant }` | OpenAPI PUT /api/tenants/{id} returns `{ tenant: object }` (openapi.ts:938) | Done |
| SPEC-3: OpenAPI server port 3457 | Change 3456 to 3457 | `servers[0].url = 'http://localhost:3457'` (openapi.ts:27) | Done |
| Tests pass | 526 tests (405+121) | 526 tests passing | Done |

## Files Verified

- `apps/api/src/engine/agent-manager.ts` — `createAgentRecord()` includes `tenant_id` in INSERT
- `apps/api/src/engine/handlers/agent.ts` — `tenantId` passed from caller to `createAgentRecord`
- `apps/api/src/routes/agents.ts` — `verifyAgentTenant()` on DELETE/start/stop/restart
- `apps/api/src/middleware/auth.ts` — `/api/mcp` absent from `PUBLIC_PATHS`
- `apps/api/src/routes/mcp.ts` — `currentAuth` propagated; `tenantFilter()`/`isAgentAccessible()` applied
- `apps/api/src/routes/analytics.ts` — agentId tenant check; alert PUT/DELETE pass `tenantId`
- `apps/api/src/engine/anomaly-detector.ts` — `updateAlertRule`/`deleteAlertRule` tenant ownership checks
- `apps/api/src/routes/config.ts` — `requireRole('admin')` on PUT /config
- `apps/api/src/openapi.ts` — `rules` key, `tenant` object, port 3457 all correct

## Test Results

- Root: 405 passed
- Web: 121 passed
- Total: 526 passed
