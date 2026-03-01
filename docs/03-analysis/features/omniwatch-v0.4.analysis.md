# Vigil v0.4 Gap Analysis (Revision 3)

> **Analysis Type**: Gap Analysis (Design vs Implementation)
> **Date**: 2026-02-27
> **Design Doc**: [vigil-v0.4.design.md](../../02-design/features/vigil-v0.4.design.md)
> **Plan Doc**: [vigil-v0.4.plan.md](../../01-plan/features/vigil-v0.4.plan.md)

## Revision History

| Version | Date | Core Rate | Overall Rate | Key Changes |
|---------|------|:---------:|:------------:|-------------|
| Rev 1 | 2026-02-27 | ~88% | ~72% | Initial analysis |
| Rev 2 | 2026-02-27 | 92% | 77% | Post-bugfix (self-healer, multi-AI, dashboard fixes) |
| **Rev 3** | **2026-02-27** | **93%** | **78%** | **Zombie agent detection, comprehensive re-audit** |

---

## Overall Scores

| Category | Rev 2 | Rev 3 | Status |
|----------|:-----:|:-----:|:------:|
| FR-01: Monorepo Migration | 95% | 95% | OK |
| FR-02: HTTP REST API (Hono) | 92% | 92% | OK |
| FR-03: Web Dashboard (Next.js) | 88% | 88% | WARN |
| FR-04: Shared Packages | 90% | 92% | OK |
| FR-05: Plugin System | 0% | 0% | DEFERRED v0.5 |
| FR-06: npm Publish | 35% | 35% | DEFERRED v0.5 |
| Build Configuration | 97% | 97% | OK |
| Convention Compliance | 93% | 93% | OK |
| **Core (FR-01~04 + Build + Convention)** | **92%** | **93%** | **PASS** |

---

## FR-01: Monorepo Migration — 95%

### Verified
- Root config: `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json` — ALL PRESENT
- 4 apps: `cli`, `daemon`, `api`, `web` — ALL with package.json
- 2 packages: `shared`, `db` — ALL with package.json
- Import migration complete: zero `../shared/` relative imports
- 114 tests pass, turbo build works

### Gap
- `packages/ai` not extracted — AI code remains in `apps/daemon/src/ai-provider.ts`

---

## FR-02: HTTP REST API — 92%

### Design Endpoints (11/11 matched)
GET /api/agents, GET /api/agents/:id, POST /api/agents, DELETE /api/agents/:id,
POST /:id/start, POST /:id/stop, POST /:id/restart, GET /:id/logs,
GET /api/notifications, GET /api/system/status, WS /ws

### Additional Endpoints (7 beyond design)
GET /:id/metrics, GET /health, GET/PUT /api/config,
POST /:id/chat, POST /agents/preview, POST /:id/apply

### Infrastructure
CORS, error-handler middleware, logger middleware, rpc-bridge — ALL PRESENT

### Gap
- `@hono/zod-validator` not installed, no runtime request validation

---

## FR-03: Web Dashboard — 88%

### Pages (6/6 matched)
Dashboard(/), Agents(/agents), Agent Detail(/agents/[id]),
Create Agent(/agents/new), Notifications(/notifications), Settings(/settings)

### Verified
- Glass Console theme (#0a0a0f, emerald accent, backdrop-blur)
- WebSocket real-time, API proxy, mobile responsive
- Beyond-design: Chat UI, bulk actions, code preview, metrics tab

### Gaps
- `src/components/`, `src/hooks/`, `src/lib/` directories missing (all inlined)
- `recharts` not installed (text-only metrics)
- `shadcn/ui` not used (custom CSS instead)
- `zustand` installed but unused (useState per page)

---

## FR-04: Shared Packages — 92%

### Verified
- `packages/shared` — 6 files, 15+ types, 17+ constants (incl. ZOMBIE_*)
- `packages/db` — 3 files, SQLite WAL, config CRUD
- Dependency graph matches design

### Gap
- `packages/ai` not created

---

## FR-05: Plugin System — 0% (DEFERRED v0.5)

Completely unimplemented. No plugin interfaces, loading, or manifest.

## FR-06: npm Publish — 35% (DEFERRED v0.5)

`bin.omni` present. Missing: `bin.vigild`, `prepublishOnly`, `.npmignore`, root `private: true` blocks publish.

---

## Self-Healing Enhancement (Beyond Design)

| Healing Path | Trigger | Status |
|--------------|---------|:------:|
| Process crash | `handleAgentExit` → `attemptHeal` | PRESENT |
| Heartbeat timeout | `checkAgentHealth` → SIGKILL → `attemptHeal` | PRESENT |
| **Zombie detection** | **`checkZombieAgents` → SIGTERM → `attemptHeal`** | **NEW Rev 3** |
| Missing module fast path | Regex parse → add to package.json → npm install | PRESENT |
| AI code regeneration | Claude API → validate → write → restart | PRESENT |

---

## Added Features (Beyond Design)

- 7 extra API endpoints (chat, preview, apply, config, metrics, health)
- Multi-provider AI (Anthropic + OpenAI)
- Zombie agent detection (error log frequency monitoring)
- Missing module fast path in self-healer
- Bulk agent actions, agent chat UI, code preview
- Notification pagination + date range filter

---

## Score Calculation

| Category | Weight | Score | Weighted |
|----------|:------:|:-----:|:--------:|
| FR-01: Monorepo | 20% | 95% | 19.0 |
| FR-02: REST API | 20% | 92% | 18.4 |
| FR-03: Web Dashboard | 20% | 88% | 17.6 |
| FR-04: Shared Packages | 15% | 92% | 13.8 |
| Build Configuration | 10% | 97% | 9.7 |
| Convention Compliance | 15% | 93% | 14.0 |
| **Core Total** | **100%** | | **93%** |

---

## Recommended Actions (to reach 95%+)

1. Extract `packages/ai` from daemon (FR-01/04 +3%)
2. Add `@hono/zod-validator` + schemas (FR-02 +8%)
3. Extract web components/hooks/lib (FR-03 +8%)
4. Install `recharts` for metrics charts (FR-03 +2%)

## Conclusion

**Core Match Rate: 93%** — Exceeds 90% threshold. v0.4 is functionally complete.
Implementation exceeds design in zombie detection, multi-AI, chat UI, bulk actions.
Remaining gaps are architectural refinements, not missing functionality.
