# OmniWatch v4.21 Plan — Critical Security: Tenant Isolation & Auth Hardening

## Goal

Fix critical multi-tenant security vulnerabilities where mutation routes (DELETE/start/stop/restart agents), MCP endpoints, analytics alerts, and config PUT bypass tenant isolation or lack proper RBAC enforcement. Also fix the agent creation bug where `tenant_id` is silently dropped.

## Scope

### BUG-1: Agent creation drops tenant_id (Critical)
- `handlers/agent.ts` receives `tenantId` from route but ignores it
- `createAgentRecord()` INSERT has no `tenant_id` column → defaults to `'default'`
- **Fix**: Pass `tenantId` through handler → `createAgentRecord()` → INSERT

### SEC-1: Agent mutation routes missing tenant isolation (Critical)
- `DELETE /agents/:id`, `POST /agents/:id/start|stop|restart` — no tenant ownership check
- Operator from tenant A can destroy/control tenant B's agents
- **Fix**: Add tenant ownership verification before executing mutations (same pattern as GET /:id)

### SEC-2: MCP endpoints unauthenticated + no tenant filter (Critical)
- `auth.ts` skips auth for `/api/mcp` → anonymous viewer with `default` tenant
- All MCP tools query all tenants' agents without filter
- **Fix**: Remove MCP from PUBLIC_PATHS bypass; require auth; filter queries by `tenant_id`

### SEC-3: Analytics metrics missing agentId tenant check (High)
- `GET /analytics/metrics` accepts any `agentId` without verifying tenant ownership
- **Fix**: Verify agent belongs to caller's tenant before returning metrics

### SEC-4: Alert rule PUT/DELETE missing tenant check (High)
- `PUT/DELETE /analytics/alerts/:id` — no tenant ownership verification
- `anomaly-detector.ts` `updateAlertRule`/`deleteAlertRule` don't check tenant_id
- **Fix**: Add tenant_id WHERE clause to update/delete queries

### SEC-5: PUT /config missing requireRole (High)
- Any authenticated user (including viewer) can modify AI API keys, webhooks
- **Fix**: Add `requireRole('admin')` to PUT /config

### SPEC-1: OpenAPI alerts response key mismatch (Medium)
- OpenAPI says `{ alerts }`, actual returns `{ rules }`
- **Fix**: Update OpenAPI spec to match `{ rules }`

### SPEC-2: OpenAPI PUT /tenants response mismatch (Medium)
- OpenAPI says `{ ok }`, actual returns `{ tenant }`
- **Fix**: Update OpenAPI spec to match `{ tenant }`

### SPEC-3: OpenAPI server port wrong (Medium)
- OpenAPI says `localhost:3456` (legacy), actual is `3457` (unified server)
- **Fix**: Update to `localhost:3457`

## Files

- `apps/api/src/engine/handlers/agent.ts` — Pass tenantId to createAgentRecord
- `apps/api/src/engine/agent-manager.ts` — Add tenant_id to INSERT
- `apps/api/src/routes/agents.ts` — Add tenant check on DELETE/start/stop/restart
- `apps/api/src/middleware/auth.ts` — Remove MCP auth bypass
- `apps/api/src/routes/mcp.ts` — Add tenant filtering to all tools/resources
- `apps/api/src/routes/analytics.ts` — Add agentId tenant verification, alert tenant checks
- `apps/api/src/engine/anomaly-detector.ts` — Add tenant_id to update/delete queries
- `apps/api/src/routes/config.ts` — Add requireRole('admin') to PUT
- `apps/api/src/openapi.ts` — Fix alerts key, tenants response, server port

## Success Criteria

- Agent creation stores caller's tenant_id in DB
- Agent mutation routes reject cross-tenant operations with 404
- MCP requires authentication (API key or Bearer token)
- MCP tools only return/operate on caller's tenant's agents
- Analytics metrics verify agentId belongs to caller's tenant
- Alert rule update/delete verify tenant ownership
- PUT /config restricted to admin role
- OpenAPI spec matches actual responses
- Build passes
- All existing tests pass
