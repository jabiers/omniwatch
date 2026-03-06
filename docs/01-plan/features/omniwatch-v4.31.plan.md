# OmniWatch v4.31 Plan — API Consistency & Validation

## Scope
5 API consistency improvements: Zod validation gaps, rate limiter IP handling, snapshot response typing, and snapshot response wrapping.

## Tasks

| # | ID | Category | File | Description | Priority |
|---|-----|----------|------|-------------|----------|
| 1 | VAL-1 | Validation | `chat.ts:40` | GET /agents/:id/chat `limit` query param uses raw `Number()` without Zod validation. Add `zValidator('query', chatQuerySchema)` | Medium |
| 2 | VAL-2 | Validation | `snapshots.ts:71` | POST /agents/:id/snapshots response not wrapped: returns raw `result` instead of `{ snapshot: result }` | Medium |
| 3 | VAL-3 | Validation | `snapshots.ts:102` | POST /agents/:id/snapshots/:seq/restore response not wrapped: returns raw `result` instead of `{ snapshot: result }` | Medium |
| 4 | NET-1 | Network | `rate-limit.ts:30` | Rate limiter defaults IP to `'unknown'` when x-forwarded-for is missing. All headerless clients share one bucket. Use `c.env?.remoteAddr` or connection IP as fallback | Medium |
| 5 | TYPE-1 | Type Safety | `snapshots.ts:43` | GET /agents/:id/snapshots `.all(id)` result not typed. Cast to `AgentSnapshot[]` | Low |

## Files to Change
- `apps/api/src/routes/chat.ts` — add chatQuerySchema with Zod
- `apps/api/src/routes/snapshots.ts` — response wrapping + type cast
- `apps/api/src/middleware/rate-limit.ts` — improve IP detection fallback
- `tests/api-routes.test.ts` — add/update tests for new validation

## Risk Assessment
- No breaking changes
- Rate limiter change may need testing with reverse proxy setups
