# OmniWatch v4.25 Plan — Security Hardening + Code Quality

## Goal

Fix SQL injection risk in MCP tenant filter, add system status tenant isolation, extract magic numbers to constants, validate rate limiter env vars, add marketplace pagination.

## Scope

### SEC-1: MCP tenantFilter SQL parameterization
- Replace string-interpolated `tenantFilter()` in `routes/mcp.ts` with parameterized approach
- All SQL queries using tenant filter must use `?` binding

### SEC-2: System status tenant isolation
- `GET /system/status` agent counts should be filtered by caller's tenant (non-admin)

### CODE-1: Magic number extraction
- `OLLAMA_HEALTH_TIMEOUT = 3_000` (system.ts)
- `MCP_DEFAULT_LIMIT = 20`, `MCP_LOG_LIMIT = 30` (mcp.ts)
- `SESSION_TTL_MS` already exists in oauth.ts but as local; move to shared

### CODE-2: Rate limiter NaN guard
- Validate `parseInt` results in rate-limit.ts

### CODE-3: Marketplace pagination
- Add limit/offset to GET /api/marketplace list query schema

## Files

- `apps/api/src/routes/mcp.ts` — tenantFilter parameterization
- `apps/api/src/routes/system.ts` — tenant-filtered counts
- `apps/api/src/middleware/rate-limit.ts` — NaN validation
- `apps/api/src/routes/marketplace.ts` — pagination support
- `packages/shared/src/constants.ts` — new constants

## Success Criteria

- Zero string-interpolated SQL in tenantFilter
- System status counts respect tenant isolation
- All magic numbers extracted to constants
- Rate limiter validates env vars
- Marketplace supports pagination
- All tests pass
