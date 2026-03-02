# OmniWatch v4.20 Plan — Analytics Partial Failure Error Handling

## Goal

Add user-visible error handling for analytics data fetch failures. The analytics page uses `Promise.allSettled()` for multiple API calls but silently swallows failures, showing empty charts with no indication of errors.

## Scope

- **analytics/page.tsx**: After `Promise.allSettled()`, count rejected promises (`failCount`). If all requests fail, show an error state. If some requests fail (partial failure), show a warning message to the user indicating incomplete data.

## Files

- `apps/web/src/app/analytics/page.tsx` — Partial failure detection and UI feedback

## Success Criteria

- When all analytics API requests fail, user sees an error message
- When some analytics API requests fail, user sees a partial failure warning
- When all requests succeed, no warning is shown (existing behavior preserved)
- Build passes
- All 526 tests pass
