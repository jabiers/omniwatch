# OmniWatch v2.0 PDCA Completion Report

## Summary

데몬(Unix Socket RPC)과 API(Hono HTTP)를 단일 프로세스로 통합 완료.
IPC 오버헤드 제거, 아키텍처 단순화 달성.

## Plan → Do

| Planned Task | Status | Notes |
|-------------|--------|-------|
| Daemon engine.ts export module | Done | 8 handler groups + initEngine/shutdownEngine |
| Daemon tsup config (engine entry) | Done | |
| Daemon package.json exports | Done | `./engine` subpath |
| API dependency on @omniwatch/daemon | Done | workspace:* |
| API index.ts — initEngine() | Done | Replaced ensureDaemon() |
| API routes migration (10 files) | Done | rpcCall → direct handler calls |
| rpc-bridge.ts deleted | Done | Unix socket client removed |
| ensureDaemon() removed | Done | |
| isDaemonRunning() guards removed | Done | Always running in-process |
| MCP version hardcode fixed | Done | APP_VERSION from shared |
| Tests updated (3 files) | Done | Engine mock pattern |
| Webpack runtime path fix | Done | dirname/fileURLToPath pattern |
| Next.js serverExternalPackages | Done | @omniwatch/daemon, isolated-vm |
| README/README.ko.md updated | Done | Architecture diagram, tech stack |
| Promo site updated | Done | Architecture, GettingStarted, constants |

## Check (Gap Analysis)

- **Match Rate**: 100%
- **Build**: 6/6 packages passed
- **Tests**: 351 tests, 34 files passed (1 removed: daemon-offline 503 test)
- **rpc-bridge references**: 0 remaining

## Architecture Change

| Item | Before (v1.x) | After (v2.0) |
|------|---------------|--------------|
| Process model | API + Daemon (2 processes) | Unified server (1 process) |
| IPC | Unix Socket JSON-RPC 2.0 | Direct function calls |
| Agent fork() parent | Daemon process | API server process |
| Startup | API spawns Daemon as detached child | Engine init in-process |
| Latency | Socket connect + serialize + deserialize per call | Zero overhead (function call) |

## Files Changed

### New (2)
- `apps/daemon/src/engine.ts` — Engine lifecycle module
- `docs/01-plan/features/omniwatch-v2.0.plan.md`

### Deleted (1)
- `apps/api/src/lib/rpc-bridge.ts` — Unix socket client

### Modified (28)
- `apps/api/src/index.ts` — initEngine() replaces ensureDaemon()
- `apps/api/src/routes/*.ts` (10 files) — Direct handler calls
- `apps/api/package.json` — @omniwatch/daemon dependency
- `apps/api/tsup.config.ts` — external config
- `apps/daemon/package.json` — exports field
- `apps/daemon/tsup.config.ts` — engine entry
- `apps/daemon/src/agent-manager.ts` — webpack-safe path resolution
- `apps/web/next.config.ts` — serverExternalPackages
- `tests/*.test.ts` (3 files) — engine mock pattern
- `README.md` + `README.ko.md` — architecture, tech stack, project structure
- `promo/src/components/Architecture.tsx` — unified server diagram
- `promo/src/components/GettingStarted.tsx` — removed daemon step
- `promo/src/lib/constants.ts` — v2.0 timeline, stats
- All 6 package.json — version 2.0.0

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Integration direction | Engine embedded in API | Preserves Hono middleware ecosystem |
| Handler signature | `null as any` for Socket param | Minimal change to handler code |
| Daemon standalone | Preserved (index.ts untouched) | Backward compatibility if needed |
| Webpack fix | dirname + resolve pattern | Avoids `new URL()` module resolution |

## Metrics

- **Lines added**: 798
- **Lines deleted**: 465
- **Files touched**: 35
- **Commits**: 2 (feat + docs)
- **Version**: 1.9.1 → 2.0.0

## Lessons Learned

1. **Webpack `new URL()` trap**: `new URL('./file', import.meta.url)` is resolved by webpack as a module dependency. Use `dirname(fileURLToPath(import.meta.url))` + `resolve()` instead.
2. **serverExternalPackages**: When a workspace package depends on native modules (isolated-vm, better-sqlite3), it must be excluded from webpack bundling via Next.js config.
3. **In-process engine**: Eliminates serialization/deserialization overhead for every API call, significantly simplifying the architecture without losing any functionality.
