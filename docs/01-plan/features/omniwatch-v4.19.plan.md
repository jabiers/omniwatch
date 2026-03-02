# OmniWatch v4.19 Plan — Tenant PUT Response Wrapping + Recipe Install Auth

## Goal

Fix two API consistency issues: (1) PUT /tenants/:id returns a bare tenant object instead of wrapping it in `{ tenant }` like other endpoints; (2) POST /recipes/:id/install has no role guard, allowing viewers to create agents via recipe install.

## Scope

- **tenants.ts** line 110: Change `c.json(tenant)` to `c.json({ tenant })` for response wrapping consistency with other tenant endpoints
- **recipes.ts**: Add `requireRole('admin', 'operator')` middleware to POST `/recipes/:id/install` — viewers should not be able to create agents

## Files

- `apps/api/src/routes/tenants.ts` — Response wrapping fix
- `apps/api/src/routes/recipes.ts` — Role guard on install endpoint

## Success Criteria

- PUT /tenants/:id response body shape is `{ tenant: { ... } }` not `{ ... }`
- POST /recipes/:id/install rejects viewer-role requests with 403
- Build passes
- All 526 tests pass
