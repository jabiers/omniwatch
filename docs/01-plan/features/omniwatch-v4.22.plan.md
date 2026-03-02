# OmniWatch v4.22 Plan — SQL Parameterization, Code Quality, Test Coverage

## Goal

Fix SQL template literal injection risk in packages/db/usage.ts, replace console.error with structured logger in agent runtime, type-safe AST walker in code-validator, and add tests for untested high-priority API routes.

## Scope

### SQL-1: usage.ts SQL template literal → parameterized (High)
- `getUsageSummary()` uses `${days}` directly in 4 SQL queries
- `days` is a number so not immediately exploitable, but violates safe SQL patterns
- **Fix**: Use SQLite date modifier as parameter binding

### CODE-1: code-validator.ts `any` types → acorn.Node (Low)
- 6 `any` types for AST node parameters in walkNode, isAlwaysTruthy, hasBreakOrReturn
- **Fix**: Use `acorn.Node` with type assertions where needed

### CODE-2: runtime.ts console.error → structured logger (Low)
- 4 `console.error` calls in agent runtime process
- Note: runtime.ts runs in a child process, may not have logger available
- **Fix**: Keep console.error for startup/crash errors in child process (legitimate use)

### CODE-4: MODEL_PRICING outdated model IDs (Low)
- Missing latest model IDs (claude-opus-4-6, claude-sonnet-4-6)
- **Fix**: Add current model IDs while keeping old ones for backward compatibility

### TEST-1: Add tests for high-priority untested routes
- POST /analytics/alerts (alert rule creation)
- PUT /analytics/alerts/:id (alert rule update)
- GET /analytics/alerts (alert rule list)
- PUT /config (now admin-only)
- GET /config

## Files

- `packages/db/src/usage.ts` — SQL parameterization + model pricing update
- `apps/api/src/engine/code-validator.ts` — AST node typing
- `tests/api-routes.test.ts` — New route tests

## Success Criteria

- No `${days}` template literals in SQL queries
- code-validator has zero `any` types
- MODEL_PRICING includes current Claude model IDs
- New tests for 5 alert/config routes
- Build passes
- All tests pass
