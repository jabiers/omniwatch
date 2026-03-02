# OmniWatch v4.15 Plan — Agents/Notifications Pagination (limit/offset)

## Goal

Add proper pagination support (limit + offset) to GET /agents and GET /notifications endpoints, which previously returned unbounded result sets.

## Scope

- **GET /agents**: Add `limit` (max 500, default 100) and `offset` (default 0) to query schema; update SQL query with `LIMIT ? OFFSET ?`
- **GET /notifications**: Add `offset` (default 0) to existing query schema (already has `limit`); update SQL query with `OFFSET ?`

## Files

- `apps/api/src/routes/agents.ts` — Add limit/offset to Zod schema and SQL query
- `apps/api/src/routes/notifications.ts` — Add offset to Zod schema and SQL query

## Success Criteria

- `GET /agents?limit=10&offset=20` returns 10 agents starting from position 20
- `GET /notifications?limit=50&offset=100` returns 50 notifications starting from position 100
- Default behavior: agents returns max 100, notifications uses existing default
- `limit` capped at 500 for agents
- Build passes
- All 526 tests pass
