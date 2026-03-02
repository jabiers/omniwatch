# OmniWatch v4.25 Gap Analysis

## Match Rate: 100%

Initial analysis found SESSION_TTL_MS not moved to shared (92%). Fixed in follow-up commit.

## Changes

| Item | Plan | Implementation | Status |
|------|------|---------------|--------|
| SEC-1: MCP tenantFilter SQL parameterization | Replace string-interpolated tenantFilter with `?` binding | `tenantFilter()` returns `{ clause, params }`; all 6 SQL query sites parameterized | Done |
| SEC-2: System status tenant isolation | Agent counts filtered by caller's tenant (non-admin) | `system.ts` builds tClause/tParams conditionally for agentCount/runningCount | Done |
| CODE-1: OLLAMA_HEALTH_TIMEOUT | Extract 3000 from system.ts | `constants.ts` + `index.ts` export, `system.ts` import | Done |
| CODE-1: MCP_DEFAULT_LIMIT + MCP_LOG_LIMIT | Extract 20/30 from mcp.ts | `constants.ts` + `index.ts` export, `mcp.ts` import | Done |
| CODE-1: SESSION_TTL_MS move to shared | Move local constant from oauth.ts | `constants.ts` + `index.ts` export, `oauth.ts` import (iteration fix) | Done |
| CODE-2: Rate limiter NaN guard | Validate parseInt in rate-limit.ts | `parseInt(..., 10) \|\| fallback` pattern for both env vars | Done |
| CODE-3: Marketplace pagination | Add limit/offset to GET /marketplace | Zod schema (limit 1-100 default 50, offset default 0), SQL `LIMIT ? OFFSET ?` | Done |

## Test Results

- Root: 432 passed
- Web: 121 passed
- Total: 553 passed
