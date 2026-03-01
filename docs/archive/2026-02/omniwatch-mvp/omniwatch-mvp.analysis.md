# Gap Analysis: vigil-mvp

> **Date**: 2026-02-27
> **Design Doc**: docs/02-design/features/vigil-mvp.design.md
> **Match Rate**: 90% (iteration 1: 78% → 90%)
> **Status**: Pass

---

## 1. Overall Scores

| Category | Score (v0.1) | Score (v0.2) | Status |
|----------|:-----:|:-----:|:------:|
| Component Match | 79% | 86% | Warning |
| IPC Protocol | 92% | 100% | Pass |
| Data Model | 100% | 100% | Pass |
| FR Completeness | 71% | 81% | Warning |
| Architecture | 92% | 92% | Pass |
| Convention | 90% | 95% | Pass |
| Test Coverage | 38% | 62% | Warning |
| **Overall** | **78%** | **Warning** |

---

## 2. Component Analysis

### Shared Layer

| Design File | Status | Notes |
|-------------|:------:|-------|
| shared/types.ts | Implemented | All types match design |
| shared/constants.ts | Implemented | Paths, heartbeat values, whitelisted packages, forbidden APIs |
| shared/errors.ts | Implemented | All 7 design error codes + 2 additional |
| shared/config.ts | Partial | Format mismatch: design says TOML, impl uses JSON |
| shared/db.ts | Implemented | All 4 tables match design schema exactly |
| shared/schema.ts | Changed | Design lists separate file; impl inlines in db.ts migrate() |
| shared/logger.ts | Implemented | Structured JSON logging with level filtering |
| shared/ipc-protocol.ts | Implemented | Full RPC protocol helpers |

### Daemon Layer

| Design File | Status | Notes |
|-------------|:------:|-------|
| daemon/index.ts | Implemented | PID file, graceful shutdown |
| daemon/rpc-server.ts | Implemented | Unix Socket server, handler registry |
| daemon/agent-manager.ts | Implemented | Full CRUD, fork/start, stop, restart, destroy, restore |
| daemon/code-generator.ts | Implemented | Claude API code generation |
| daemon/code-validator.ts | Partial | Regex-based, not AST-based as specified |
| daemon/health-monitor.ts | Implemented | Heartbeat tracking, timeout detection |
| daemon/self-healer.ts | Implemented | Full healing flow |
| daemon/notifier.ts | Implemented | Webhook + macOS notification |
| daemon/scheduler.ts | Partial | File exists but never imported/started from daemon/index.ts |
| daemon/handlers/*.ts | Implemented | agent, log, system handlers |
| (Additional) dependency-installer.ts | Extra | Not in design but useful |

### Agent Layer

| Design File | Status | Notes |
|-------------|:------:|-------|
| agent/runtime.ts | Implemented | SDK init, code load, heartbeat, signals |
| agent/sdk.ts | Implemented | VigilSDK interface fully matches design |
| agent/templates/base-prompt.ts | Missing | System prompt inlined in code-generator.ts |

### CLI Layer

| Design File | Status | Notes |
|-------------|:------:|-------|
| cli/index.ts | Implemented | Commander.js with all commands (except dash) |
| cli/ipc-client.ts | Implemented | rpcCall, rpcStream, connectStream |
| cli/commands/watch.ts | Implemented | Prompt-based agent creation |
| cli/commands/list.ts | Implemented | Table format with status colors |
| cli/commands/logs.ts | Partial | Missing `--follow` streaming |
| cli/commands/start,stop,restart,destroy.ts | Implemented | |
| cli/commands/status.ts | Implemented | Detailed status display |
| cli/commands/config.ts | Implemented | set/get/list subcommands |
| cli/commands/daemon.ts | Implemented | start/stop/status + ensureDaemon |
| cli/commands/dash.ts | Missing | TUI dashboard not implemented |
| cli/ui/*.tsx | Missing | All Ink TUI components missing |

---

## 3. Gap Details

### 3.1 Missing Items

| # | Item | Impact | FR |
|---|------|--------|-----|
| 1 | TUI Dashboard (`vigil dash`) + all Ink UI components | Medium | FR-07 |
| 2 | `agent.logs.stream` RPC method | Medium | FR-03 |
| 3 | `--follow` flag for logs command | Medium | FR-03 |
| 4 | Code preview + user confirm step | Low | FR-16 |
| 5 | `agent/templates/base-prompt.ts` | Low | structural |
| 6 | Ink dependency | Medium | blocks TUI |

### 3.2 Partial Implementations

| # | Item | Design Spec | Current State |
|---|------|-------------|---------------|
| 1 | Code Validator | AST-based | Regex pattern matching |
| 2 | Config Format | TOML (config.toml) | JSON despite .toml filename |
| 3 | Scheduler | Daemon component | Never imported/started |
| 4 | Agent Status Flow | creating->ready->running | creating->running (skips ready) |

### 3.3 Code Quality Issues

| # | Issue | File:Line | Impact |
|---|-------|-----------|--------|
| 1 | `require()` in ESM module | `src/daemon/notifier.ts:74` | Runtime error |
| 2 | Heavy `as Partial<Agent>` casts | `src/daemon/agent-manager.ts` | Type safety |

---

## 4. Recommended Actions (Priority Order)

### Quick Wins (can reach ~90% with these)

1. Fix `require()` in notifier.ts -> use `execSync` from top-level import
2. Wire up scheduler in daemon/index.ts (import + start/stop)
3. Implement `--follow` for logs using existing stream infrastructure
4. Add `agent.logs.stream` RPC handler
5. Rename `config.toml` to `config.json` in constants.ts
6. Add agent-manager and health-monitor unit tests

### Defer to v0.2 (update design doc)

- TUI Dashboard (Ink) - significant feature, not blocking CLI usage
- AST-based code validator - regex sufficient for MVP
- Code preview step in watch command

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-02-27 | Initial gap analysis |
