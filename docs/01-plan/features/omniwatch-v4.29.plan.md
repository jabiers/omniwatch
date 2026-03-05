# OmniWatch v4.29 Plan

## Feature: v4.29 — Terminal Fix, Chat Persistence, Telegram Help, Marketplace Seed

### Scope
5 critical fixes addressing user-reported issues:

### Tasks

| # | Task | Priority | Status |
|---|------|----------|--------|
| 1 | Fix Terminal tab (API response unwrap + command allowlist validation) | Critical | Done |
| 2 | Persistent chat history per agent (v007 migration, DB storage, GET/DELETE/summarize) | High | Done |
| 3 | Chat session management (Clear + Summarize buttons in UI) | High | Done |
| 4 | Telegram chat ID help text and discovery instructions | Medium | Done |
| 5 | Marketplace seed from built-in recipes + category alignment | High | Done |

### Files Changed
- `apps/web/src/app/agents/[id]/page.tsx` — Terminal unwrap fix, chat history load/clear/summarize
- `apps/api/src/routes/agents.ts` — exec command allowlist validation
- `apps/api/src/routes/chat.ts` — GET/DELETE/POST-summarize chat endpoints
- `apps/api/src/routes/marketplace.ts` — seedMarketplace(), category enum expansion
- `apps/api/src/engine/engine.ts` — call seedMarketplace on init
- `apps/web/src/app/settings/page.tsx` — Telegram chat ID instructions
- `apps/web/src/app/marketplace/page.tsx` — category alignment (finance/devops/social)
- `apps/web/src/__tests__/pages/marketplace.test.tsx` — test update
- `packages/db/src/migrations/v007-chat-history.ts` — NEW: agent_chat_messages table
- `packages/db/src/migrations/index.ts` — v007 registration

### Root Cause Analysis
1. Terminal: API returns `{ result: {...} }`, frontend expected flat response
2. Chat: Pure in-memory (React state), no DB persistence
3. Telegram: No help text for chat ID discovery
4. Marketplace: DB-backed but zero seed data; category enum mismatch
