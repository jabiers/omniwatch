# OmniWatch v4.27 Plan — Comprehensive QA & UX Overhaul

## Scope

5-cycle PDCA iteration covering: runtime fix, login overhaul, self-healing enhancement, UX/design polish, responsive fixes.

## Cycle 1: Critical Runtime & Login Fix

| ID | Category | Description |
|----|----------|-------------|
| RT-1 | Runtime | Agent runtime path uses `import.meta.url` — works in built mode but in dev mode the path resolves to source. Verify `dist/engine/agent/runtime.js` exists after build and is used correctly |
| RT-2 | Runtime | Self-healer fast path: "Cannot find module" detection works but agent was created from old `tempomni` path — add path validation on agent start to detect stale paths |
| AUTH-1 | Login | Logout doesn't call `POST /api/auth/logout` — session stays active on server (security hole) |
| AUTH-2 | Login | AuthGuard rehydration race condition — `setChecked` never called if hydration fires before effect |
| AUTH-3 | Login | No session expiry detection — users stay "logged in" with expired tokens, get 401s |
| AUTH-4 | Login | Login page uses raw `fetch()` instead of `apiFetch()` — no timeout protection |

## Cycle 2: Self-Healing Enhancement

| ID | Category | Description |
|----|----------|-------------|
| HEAL-1 | Self-Heal | Add "smart restart" — before AI regen, try simple restart first (transient errors) |
| HEAL-2 | Self-Heal | Expand whitelisted packages beyond current 10 (add common monitoring packages) |
| HEAL-3 | Self-Heal | Add heal history display in agent detail page (show what was tried) |
| HEAL-4 | Self-Heal | Reset heal_count when user manually edits/restarts agent (allow re-healing) |

## Cycle 3: UX/Design Polish

| ID | Category | Description |
|----|----------|-------------|
| UX-1 | Design | Agent detail metrics grid not responsive (`grid-cols-3` → `grid-cols-1 md:grid-cols-3`) |
| UX-2 | Design | Chat container fixed `height: 480` → responsive height |
| UX-3 | Design | Replace spinner loading with skeleton loaders (queue, analytics, recipes, marketplace) |
| UX-4 | Design | Queue error banner missing dismiss button |
| UX-5 | Design | Settings Telegram grid not responsive |

## Cycle 4: Auth Flow Polish & Security

| ID | Category | Description |
|----|----------|-------------|
| SEC-1 | Security | Add 401 interceptor in `apiFetch` — auto-redirect to login on expired session |
| SEC-2 | Security | Add `/api/auth/me` call on app mount to validate session |
| SEC-3 | Security | Login page timeout protection (15s) |

## Cycle 5: Final Integration & Edge Cases

| ID | Category | Description |
|----|----------|-------------|
| INT-1 | Integration | Verify all fixes work together end-to-end |
| INT-2 | Integration | Run full test suite, fix any regressions |
| INT-3 | Integration | Version bump to 4.27.0 |
| INT-4 | Integration | Update test count in memory |
