# OmniWatch v4.18 Plan — Chat/Snapshot Zod Param Validation + Tenant Isolation

## Goal

Add Zod parameter validation and tenant isolation to chat and snapshot routes. Chat routes currently lack input validation on `:id` param and do not verify the requesting tenant owns the agent. Snapshot routes lack Zod validation on `:id` param.

## Scope

- **chat.ts**: Add `agentIdParam` Zod schema for `:id` validation. Add `verifyAgentAccess()` helper that loads the agent and checks `tenant_id` matches the requesting tenant. Apply to `/agents/:id/chat` and `/agents/:id/apply`. Add `requireRole('admin', 'operator')` to all chat routes.
- **snapshots.ts**: Add `agentIdParam` Zod validation to GET `/agents/:id/snapshots`, POST `/agents/:id/snapshots`, GET `/agents/:id/children`.
- **tests/api-routes.test.ts**: Update chat/apply test mocks with `mockGet.mockReturnValueOnce({id: 'agent-1', tenant_id: 'default'})` to satisfy tenant isolation checks.

## Files

- `apps/api/src/routes/chat.ts` — Zod param validation, verifyAgentAccess, requireRole
- `apps/api/src/routes/snapshots.ts` — Zod param validation on 3 endpoints
- `tests/api-routes.test.ts` — Mock updates for tenant isolation

## Success Criteria

- All chat routes reject requests without valid agent ID param
- Chat routes verify agent belongs to the requesting tenant before processing
- Chat routes require admin or operator role
- Snapshot routes validate `:id` param via Zod
- Build passes
- All 526 tests pass
