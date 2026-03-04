# OmniWatch v4.28 Plan

## Feature: v4.28 — Comprehensive Polish & New Features Batch

### Scope
8 tasks covering analytics crash fix, Gemini provider improvements, notifications enhancement,
agent command execution, recipe expansion, usage page upgrade, help page creation, and terminal UI.

### Tasks

| # | Task | Priority | Status |
|---|------|----------|--------|
| 1 | Fix analytics toFixed crash (missing min_value/max_value in SQL) | Critical | Done |
| 2 | Fix Gemini provider (json response_format) + complete model lists with pricing | High | Done |
| 3 | Fix notifications (status column, severity mapping, test endpoint, delete endpoint) | High | Done |
| 4 | Agent local command execution (IPC exec msg, REST endpoint, security sandbox) | High | Done |
| 5 | Add 15 new built-in recipes (27 total) | Medium | Done |
| 6 | Usage page: projected monthly cost + model pricing reference table | Medium | Done |
| 7 | Help/docs page (getting started, core concepts, FAQ, keyboard shortcuts, API docs) | Medium | Done |
| 8 | Agent detail Terminal tab (command input, exec output, sandbox context) | Medium | Done |

### Files Changed
- `apps/api/src/engine/metrics-collector.ts` — SQL fix
- `apps/api/src/engine/ai-provider.ts` — Gemini response_format, detectProvider o4
- `apps/api/src/engine/agent-manager.ts` — exec handler, EXEC_ALLOWED_COMMANDS
- `apps/api/src/routes/notifications.ts` — status column, test/delete endpoints
- `apps/api/src/routes/agents.ts` — POST /agents/:id/exec
- `apps/web/src/app/analytics/page.tsx` — defensive toFixed
- `apps/web/src/app/settings/page.tsx` — model lists with pricing, test notification button
- `apps/web/src/app/notifications/page.tsx` — severity mapping, truncate
- `apps/web/src/app/usage/page.tsx` — projected cost, pricing table
- `apps/web/src/app/help/page.tsx` — NEW: help page
- `apps/web/src/app/layout.tsx` — help nav item
- `apps/web/src/app/agents/[id]/page.tsx` — Terminal tab
- `packages/shared/src/types.ts` — exec message types
- `packages/shared/src/recipes.ts` — 15 new recipes
- `packages/db/src/usage.ts` — GPT-4.1 pricing

### Risk Assessment
- Agent exec: sandboxed with allowlist, strict blocks all, admin-only REST endpoint
- No breaking changes to existing APIs
