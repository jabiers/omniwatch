# OmniWatch v4.14 Plan — Analytics Metrics `hours` Parameter

## Goal

Fix analytics metrics endpoint to respect `hours` query parameter sent by the frontend, which was previously ignored by the route handler and engine.

## Scope

- Add `hours` to Zod `metricsQuerySchema` validation in the analytics route
- Update route handler to destructure `hours` from validated query params and pass it to the engine handler
- Update engine handler to use `hours` as `limit` when provided, falling back to the existing `limit` param

## Files

- `apps/api/src/routes/analytics.ts` — Add `hours` to Zod schema, destructure and forward to engine
- `apps/api/src/engine/handlers/analytics.ts` — Use `hours` as `limit` when present

## Success Criteria

- `GET /analytics/metrics?hours=24` correctly limits results to 24 data points
- `hours` param is validated via Zod schema (must be positive integer)
- Backward compatible: requests without `hours` still use `limit` param
- Build passes
- All 526 tests pass
