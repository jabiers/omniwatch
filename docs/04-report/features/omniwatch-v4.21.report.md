# OmniWatch v4.21 Completion Report

## Summary

Critical security hardening release fixing multi-tenant isolation gaps across agent mutation routes, MCP endpoints, analytics, and config. Also corrects OpenAPI spec inaccuracies.

## Version

- **From**: 4.20.0
- **To**: 4.21.0
- **Match Rate**: 100%
- **Iterations**: 0

## Changes

### Critical Bug Fix
- **BUG-1**: Agent creation now stores caller's `tenant_id` in DB instead of defaulting to `'default'`

### Security Hardening (5 fixes)
- **SEC-1**: DELETE/start/stop/restart agent routes now verify tenant ownership before executing
- **SEC-2**: MCP endpoints require authentication (removed from PUBLIC_PATHS bypass); all MCP tools/resources filter by tenant
- **SEC-3**: `GET /analytics/metrics` verifies agentId belongs to caller's tenant
- **SEC-4**: `PUT/DELETE /analytics/alerts/:id` verify alert rule tenant ownership
- **SEC-5**: `PUT /config` restricted to admin role only

### OpenAPI Spec Corrections (3 fixes)
- **SPEC-1**: Alert rules response key corrected from `alerts` to `rules`
- **SPEC-2**: PUT /tenants/:id response schema corrected from `{ ok }` to `{ tenant }`
- **SPEC-3**: Server URL port corrected from 3456 to 3457

## Files Modified (11)

| File | Change |
|------|--------|
| `apps/api/src/engine/agent-manager.ts` | Added `tenantId` param and `tenant_id` to INSERT |
| `apps/api/src/engine/handlers/agent.ts` | Pass `tenantId` from params to `createAgentRecord` |
| `apps/api/src/routes/agents.ts` | Added `verifyAgentTenant()` to 4 mutation routes |
| `apps/api/src/middleware/auth.ts` | Removed MCP from auth bypass |
| `apps/api/src/routes/mcp.ts` | Added auth context propagation + tenant filtering |
| `apps/api/src/routes/analytics.ts` | Added agentId + alert tenant checks |
| `apps/api/src/engine/anomaly-detector.ts` | Added tenant param to update/delete functions |
| `apps/api/src/engine/handlers/analytics.ts` | Pass tenantId to update/delete |
| `apps/api/src/routes/config.ts` | Added `requireRole('admin')` to PUT |
| `apps/api/src/openapi.ts` | Fixed alerts key, tenants response, server port |
| `tests/auth-middleware.test.ts` | Updated MCP auth test |

## Test Results

- Root: 405 passed
- Web: 121 passed
- Total: **526 passed**
- Build: All 5 packages successful

## Impact

- Multi-tenant isolation is now enforced on all agent mutation operations
- MCP endpoint no longer exposes cross-tenant data
- Config modification restricted to admin users only
- OpenAPI documentation accurately reflects actual API behavior
