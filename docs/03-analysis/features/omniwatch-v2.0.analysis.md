# OmniWatch v2.0 Gap Analysis — Daemon-API Integration

## Summary

데몬(Unix Socket RPC)과 API(Hono HTTP)를 단일 프로세스로 통합.
IPC 오버헤드 제거, 아키텍처 단순화.

## Architecture Change

| Item | Before | After |
|------|--------|-------|
| Process model | API + Daemon (2 processes) | Unified server (1 process) |
| IPC | Unix Socket JSON-RPC 2.0 | Direct function calls |
| Agent fork() parent | Daemon process | API server process |
| Startup | API spawns Daemon as detached child | Engine init in-process |

## Implementation Checklist

| Task | Status |
|------|--------|
| Daemon engine.ts export module | Done |
| Daemon tsup config (engine entry) | Done |
| Daemon package.json exports | Done |
| API dependency on @omniwatch/daemon | Done |
| API index.ts — initEngine() | Done |
| API routes: agents.ts | Done |
| API routes: chat.ts | Done |
| API routes: queue.ts | Done |
| API routes: analytics.ts | Done |
| API routes: snapshots.ts | Done |
| API routes: mesh.ts | Done |
| API routes: recipes.ts | Done |
| API routes: marketplace.ts | Done |
| API routes: mcp.ts | Done |
| API routes: system.ts | Done |
| rpc-bridge.ts deleted | Done |
| ensureDaemon() removed | Done |
| isDaemonRunning() guards removed | Done |
| MCP version hardcode fixed | Done |
| Tests updated (3 files) | Done |
| webpack runtime path fix | Done |
| Next.js serverExternalPackages | Done |

## Verification

| Check | Result |
|-------|--------|
| `pnpm build` | 6/6 packages passed |
| `npx vitest run` | 351 tests, 34 files passed |
| rpc-bridge references | 0 remaining |

## Files Changed

### New
- `apps/daemon/src/engine.ts`
- `docs/01-plan/features/omniwatch-v2.0.plan.md`

### Modified
- `apps/api/src/index.ts` — initEngine() replaces ensureDaemon()
- `apps/api/src/routes/agents.ts` — handleAgentRPC direct calls
- `apps/api/src/routes/chat.ts` — handleChatRPC direct calls
- `apps/api/src/routes/queue.ts` — handleQueueRPC direct calls
- `apps/api/src/routes/analytics.ts` — handleAnalyticsRPC + handleSecurityRPC
- `apps/api/src/routes/snapshots.ts` — handleSnapshotRPC direct calls
- `apps/api/src/routes/mesh.ts` — handleMeshRPC direct calls
- `apps/api/src/routes/recipes.ts` — handleAgentRPC.create
- `apps/api/src/routes/marketplace.ts` — handleAgentRPC.create
- `apps/api/src/routes/mcp.ts` — direct engine calls + APP_VERSION
- `apps/api/src/routes/system.ts` — always running (no isDaemonRunning)
- `apps/api/package.json` — @omniwatch/daemon dependency
- `apps/api/tsup.config.ts` — @omniwatch/daemon external
- `apps/daemon/package.json` — exports field
- `apps/daemon/tsup.config.ts` — engine entry
- `apps/daemon/src/agent-manager.ts` — webpack-safe path resolution
- `apps/web/next.config.ts` — serverExternalPackages
- `tests/api-routes.test.ts` — engine mock
- `tests/auth-middleware.test.ts` — engine mock
- `tests/mcp-server.test.ts` — engine mock

### Deleted
- `apps/api/src/lib/rpc-bridge.ts`

## Match Rate

**100%** — All planned tasks implemented and verified.
