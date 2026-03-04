# Test Coverage Analysis

**Date:** 2026-03-04
**Current Coverage:** 51.82% lines | 49.64% functions | ~60% branches
**Threshold:** 70% lines | 70% functions | 60% branches

## Executive Summary

The test suite contains **432 tests across 34 test files** — all passing. Coverage is strong in security-critical areas (auth, sandbox, code validation) but falls significantly short of the 70% threshold due to large gaps in the CLI, OAuth/MCP routes, notification channels, and several engine modules. Below is a prioritized breakdown of where new tests would have the highest impact.

---

## Current Coverage Snapshot

### Well-Covered Areas (>80% lines)

| Module | Lines | Notes |
|--------|-------|-------|
| `packages/shared/src/auth.ts` | 100% | API key generation, hashing, validation |
| `middleware/auth.ts` | 100% | Auth middleware with RBAC |
| `middleware/correlation-id.ts` | 100% | Request tracing |
| `middleware/security-headers.ts` | 100% | Security headers |
| `packages/db/src/migrations/*` | 100% | All 6 migration files |
| `routes/marketplace.ts` | 97% | Marketplace CRUD |
| `routes/usage.ts` | 96% | Usage tracking |
| `routes/snapshots.ts` | 93% | Time-travel snapshots |
| `packages/shared/src/constants.ts` | 100% | Shared constants |
| `packages/shared/src/errors.ts` | 91% | Error classes |

### Critically Under-Covered Areas (0-30% lines)

| Module | Lines | Impact |
|--------|-------|--------|
| **`apps/cli/src/` (entire CLI)** | **1-4%** | User-facing reliability |
| **`routes/oauth.ts`** | **9.67%** | Authentication security |
| **`routes/mcp.ts`** | **2.4%** | Tenant isolation in MCP |
| **`middleware/error-handler.ts`** | **18.18%** | Error reporting |
| **`packages/db/src/db.ts`** | **22.22%** | Database initialization |
| **`packages/db/src/usage.ts`** | **28.57%** | Cost calculations |
| **Notification channels (Slack/Discord/Telegram)** | **24-26%** | Alert delivery |
| **`apps/web/src/lib/ws.ts`** | **0%** | WebSocket client |
| **Engine handlers (8 files)** | **0%** | Core RPC handlers |

---

## Recommended Improvements — Prioritized

### Priority 1: Security & Authentication (Highest Impact)

#### 1a. OAuth Routes (`routes/oauth.ts` — 9.67%)

This file handles session-based auth, GitHub/Google OAuth callbacks, CSRF protection, and user upsert logic. It is the primary authentication entry point for the web UI.

**Recommended tests:**
- Session lifecycle: create, validate, expire, delete
- API key login: valid key → session, invalid key → 401, malformed body
- GitHub OAuth callback: valid state + code, CSRF state mismatch, missing code, token exchange failure, missing email
- Google OAuth callback: valid flow, state mismatch, token exchange failure
- User upsert: new user creation, existing user by provider_id, email-based linking, display name/avatar updates
- Purge expired sessions: cleanup logic, database error handling

**Bugs these tests would catch:** CSRF bypass, session fixation, account takeover via email linking, token leakage in logs.

#### 1b. MCP Routes (`routes/mcp.ts` — 2.4%)

This file exposes OmniWatch agents as MCP tools with per-request auth context via `AsyncLocalStorage`. Tenant isolation is critical here.

**Recommended tests:**
- AsyncLocalStorage context: correct store/retrieve per request, no cross-request leakage
- Tenant isolation on every tool: `list_agents`, `get_agent`, `get_agent_logs`, `control_agent`, `create_agent`, `system_stats`, `capture_snapshot`
- Admin vs viewer permissions for each tool
- Resource templates: URI parsing, access control
- Transport lifecycle: singleton MCP server creation

**Bugs these tests would catch:** Tenant data leakage, privilege escalation, context pollution across concurrent requests.

---

### Priority 2: Core Engine Modules

#### 2a. Health Monitor (`health-monitor.ts` — minimal coverage)

Currently only tests lifecycle (start/stop). The core detection logic is untested.

**Recommended tests:**
- Heartbeat recording and age calculation
- Unresponsive agent detection: heartbeat timeout → error state → SIGKILL → auto-heal
- Zombie agent detection: running agents with recent errors → SIGTERM → auto-heal
- Error agent healing: respects `MAX_HEAL_ATTEMPTS`, skips exhausted agents
- Interval cleanup: no leaked intervals on stop

**Bugs these tests would catch:** Hanging agents consuming resources indefinitely, zombie processes, infinite heal loops.

#### 2b. Scheduler (`scheduler.ts` — minimal coverage)

Only lifecycle is tested. The cron matching logic — arguably the most bug-prone part — is completely untested.

**Recommended tests:**
- Cron field matching: `*` (wildcard), `*/N` (step), `N-M` (range), `N,M,P` (list), exact value
- Full 5-field cron matching: minute, hour, day-of-month, month, day-of-week
- `shouldRunNow()`: matching schedule triggers, non-matching does not, invalid format returns false
- Schedule check cycle: queries only ready/stopped agents, starts matching agents, handles start errors gracefully
- Edge cases: midnight rollover, month boundaries, leap year dates

**Bugs these tests would catch:** Agents running at wrong times, off-by-one errors in cron fields, missed schedules.

#### 2c. Engine Handlers (8 files — 0%)

The `handlers/` directory contains the core RPC layer (`agent.ts`, `chat.ts`, `snapshot.ts`, `queue.ts`, `analytics.ts`, `mesh.ts`, `security.ts`, `system.ts`). None are directly tested.

**Recommended tests:** At minimum, test the agent handler (create, start, stop, destroy flows) and the chat handler (message processing, code modification). These are the most-used code paths.

---

### Priority 3: Notification & Communication

#### 3a. Notification Channels (Slack 24%, Discord 24%, Telegram 26%)

The `send()` method — the entire purpose of each channel — is barely tested.

**Recommended tests per channel:**
- `isConfigured()`: returns true when webhook URL present, false when missing
- `send()` payload structure: correct color/severity mapping, field population, timestamp format
- HTTP error handling: 4xx/5xx responses throw descriptive errors
- Network failures: fetch errors are propagated, not swallowed
- Severity-to-color mapping: critical → red, warning → orange, info → green

**Bugs these tests would catch:** Silent notification failures (operators never alerted), malformed payloads rejected by Slack/Discord APIs.

#### 3b. Notifications Route (`routes/notifications.ts` — 45%)

**Recommended tests:**
- Pagination: limit/offset, defaults
- Filtering: by severity, by agent_id, combined
- Tenant isolation: non-admin sees only own tenant + system notifications
- Test notification dispatch: triggers all configured channels
- Delete notification: admin-only enforcement, 204 response

---

### Priority 4: CLI Commands (0-24%)

The entire CLI (`apps/cli/src/`) has near-zero coverage. While less critical than server-side code, these are the primary user-facing interface.

#### Highest-value CLI tests:

| Command | Why |
|---------|-----|
| `auth.ts` (create-key, rotate-key, whoami) | Security-sensitive: key generation, role validation, key display |
| `api-client.ts` | Foundation for all CLI commands: auth headers, timeouts, error handling |
| `list.ts` | Most-used command: status filtering, output formatting, date formatting |
| `status.ts` | Agent inspection: field display, optional field handling, status icons |
| `chat.ts` | Interactive REPL: pending code management, apply flow, error recovery |

**Recommended approach:** Mock the API client and test command logic in isolation. Focus on `auth.ts` first since it handles API key creation and display (security-sensitive).

---

### Priority 5: Database & Infrastructure

#### 5a. Database Initialization (`packages/db/src/db.ts` — 22%)

**Recommended tests:**
- Singleton pattern: first call initializes, subsequent calls return same instance
- SQLite pragmas: WAL mode, busy_timeout, foreign_keys enabled
- Directory creation: creates parent directories if missing
- `closeDb()`: sets instance to null, allows re-initialization
- Error handling: corrupted database, permission errors

#### 5b. Usage Tracking (`packages/db/src/usage.ts` — 29%)

**Recommended tests:**
- `calculateCost()`: correct pricing for each model (Claude, GPT-4, Gemini), unknown model → 0, edge cases (0 tokens, very large counts)
- `recordAIUsage()`: inserts correctly, handles null agent_id
- `getUsageSummary()`: totals aggregation, breakdown by model/agent/daily, date range filtering

**Bugs these tests would catch:** Incorrect cost calculations, missing model pricing, wrong aggregations.

#### 5c. Error Handler Middleware (`middleware/error-handler.ts` — 18%)

**Recommended tests:**
- Error with custom status code preserved
- Default to 500 for unknown errors
- Stack trace hidden in production, shown in development
- Correlation ID (requestId) included in response
- Various error types: Error objects, strings, unknown types

---

### Priority 6: Frontend (Lower Priority)

Frontend tests exist for all pages and key components, but the underlying libraries have 0% coverage because tests mock them. The highest-value addition would be:

- **`lib/ws.ts`** (0%): WebSocket connection management, reconnection logic, message parsing
- **`lib/api.ts`** (0% in coverage, but tested via mocks): The real `apiFetch` implementation with error handling

---

## Recommended Action Plan

| Phase | Target | Estimated Tests | Coverage Impact |
|-------|--------|-----------------|-----------------|
| **Phase 1** | OAuth routes + MCP routes | ~40 tests | +5-6% lines |
| **Phase 2** | Health monitor + Scheduler (cron logic) | ~30 tests | +2-3% lines |
| **Phase 3** | Notification channels + notifications route | ~25 tests | +2-3% lines |
| **Phase 4** | CLI api-client + auth + list commands | ~35 tests | +3-4% lines |
| **Phase 5** | db.ts + usage.ts + error-handler | ~20 tests | +2-3% lines |
| **Phase 6** | Engine handlers (agent, chat) | ~20 tests | +3-4% lines |

**Completing Phases 1-5 (~150 tests) should bring coverage above the 70% line threshold.**

---

## Key Observations

1. **Security-critical code has the biggest gaps.** OAuth and MCP routes handle authentication and tenant isolation but have <10% coverage. This is the highest-risk area.

2. **The CLI is essentially untested.** At 1-4% coverage across 15 command files, any refactoring is high-risk. The `auth` command is particularly concerning since it handles API key creation.

3. **Engine "brain" modules lack logic tests.** Health monitor and scheduler have lifecycle tests (start/stop) but their core logic (heartbeat timeout detection, cron matching) is untested.

4. **Notification delivery is a black box.** The `send()` methods that actually POST to Slack/Discord/Telegram webhooks have minimal coverage. Silent failures here mean operators are never alerted.

5. **Coverage thresholds are failing.** The repo requires 70% lines / 70% functions but currently sits at 51.82% / 49.64%. The gap is ~18 percentage points on lines and ~20 on functions.
