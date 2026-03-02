# OmniWatch v4.26 Plan — MCP Auth Fix + Tenant Isolation + Pagination

## Goal

Fix MCP per-request auth race condition, add analytics anomalies tenant isolation, fix notifications JOIN, add tenants/users pagination, add missing try-catch.

## Scope

### SEC-1: MCP per-request auth
- Replace module-level `currentAuth` singleton with per-request auth passing
- Thread auth context through MCP tool/resource callbacks

### SEC-2: Analytics anomalies tenant isolation
- `GET /analytics/anomalies` must check agentId belongs to caller's tenant (non-admin)

### FIX-1: Notifications LEFT JOIN
- Change INNER JOIN to LEFT JOIN so agent-less or orphaned notifications are included

### CODE-1: Tenants/Users pagination
- Add limit/offset Zod schema to GET /tenants and GET /users

### CODE-2: Missing try-catch
- Add try-catch to: notifications GET, agents GET, mesh subscriptions/events, system status

## Files

- `apps/api/src/routes/mcp.ts` — per-request auth refactor
- `apps/api/src/routes/analytics.ts` — anomalies tenant filter
- `apps/api/src/routes/notifications.ts` — LEFT JOIN + try-catch
- `apps/api/src/routes/tenants.ts` — pagination
- `apps/api/src/routes/agents.ts` — try-catch on GET /agents
- `apps/api/src/routes/mesh.ts` — try-catch on subscriptions/events
- `apps/api/src/routes/system.ts` — try-catch on GET /system/status

## Success Criteria

- Zero module-level mutable auth state in MCP
- Analytics anomalies respect tenant isolation
- Notifications include orphaned records
- Tenants/Users support pagination
- All sync DB handlers wrapped in try-catch
- All tests pass
