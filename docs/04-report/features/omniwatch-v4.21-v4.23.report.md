# OmniWatch v4.21-v4.23 Completion Report

## Summary

Three-version batch covering critical security hardening, SQL parameterization, code quality improvements, test coverage expansion, and README sync.

## Versions

| Version | Focus | Match Rate |
|---------|-------|:----------:|
| v4.21 | Critical security: tenant isolation, MCP auth, RBAC | 100% |
| v4.22 | SQL parameterization, code quality, +8 tests | 100% |
| v4.23 | README stats sync (534 tests) | 100% |

## v4.21 — Critical Security Hardening

- **BUG-1**: Agent creation now stores caller's tenant_id (was defaulting to 'default')
- **SEC-1**: DELETE/start/stop/restart agent routes verify tenant ownership
- **SEC-2**: MCP endpoints require authentication; all tools filter by tenant
- **SEC-3**: Analytics metrics verify agentId belongs to caller's tenant
- **SEC-4**: Alert rule update/delete verify tenant ownership
- **SEC-5**: PUT /config restricted to admin role
- **SPEC-1~3**: OpenAPI spec corrections (alerts key, tenants response, server port)

## v4.22 — SQL & Code Quality

- **SQL-1**: usage.ts template literal SQL → parameterized binding (4 queries)
- **CODE-1**: code-validator.ts 6 `any` types → `AstNode` type alias
- **CODE-4**: MODEL_PRICING updated (claude-opus-4-6, sonnet-4-6, haiku-4-5)
- **TEST-1**: 8 new tests for alert rule CRUD and config routes

## v4.23 — README Sync

- Test count updated: 526 → 534 (413 root + 121 web)
- Both EN and KO README synced

## Files Modified (14 unique)

| File | Version | Change |
|------|---------|--------|
| `engine/agent-manager.ts` | v4.21 | tenant_id INSERT |
| `engine/handlers/agent.ts` | v4.21 | tenantId passthrough |
| `routes/agents.ts` | v4.21 | verifyAgentTenant on mutations |
| `middleware/auth.ts` | v4.21 | MCP auth bypass removed |
| `routes/mcp.ts` | v4.21 | Full tenant filtering |
| `routes/analytics.ts` | v4.21 | agentId + alert tenant checks |
| `engine/anomaly-detector.ts` | v4.21 | tenant param on update/delete |
| `routes/config.ts` | v4.21 | requireRole('admin') |
| `openapi.ts` | v4.21 | 3 spec corrections |
| `packages/db/src/usage.ts` | v4.22 | SQL parameterization + model pricing |
| `engine/code-validator.ts` | v4.22 | any → AstNode |
| `tests/api-routes.test.ts` | v4.21-v4.22 | +8 tests, mock updates |
| `tests/auth-middleware.test.ts` | v4.21 | MCP auth test update |
| `README.md` / `README.ko.md` | v4.23 | Stats sync |

## Test Results

- Root: 413 passed (+8 from v4.20)
- Web: 121 passed
- Total: **534 passed**
- Build: All 5 packages successful
