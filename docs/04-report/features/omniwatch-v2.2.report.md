# OmniWatch v2.2 PDCA Completion Report

## Summary

CLI의 Unix Socket RPC 통신을 HTTP API 호출로 완전 전환. 독립 daemon 프로세스 제거, 단일 API 서버 아키텍처 완성.

## Changes

### New Files (2)
- `apps/cli/src/api-client.ts` — HTTP API 클라이언트 (typed fetch wrapper, 14 endpoints)
- `apps/cli/src/commands/server.ts` — API 서버 상태 확인 + `ensureServer()` export

### Deleted Files (4)
- `apps/daemon/src/index.ts` — 독립 daemon 프로세스 엔트리포인트
- `apps/daemon/src/rpc-server.ts` — Unix Socket JSON-RPC 2.0 서버
- `apps/cli/src/ipc-client.ts` — Unix Socket RPC 클라이언트
- `apps/cli/src/commands/daemon.ts` — daemon start/stop/status 명령어

### Modified Files (16)
- `apps/cli/src/index.ts` — daemon → server 명령어 교체
- `apps/cli/src/commands/watch.ts` — rpcCall → createAgent/previewAgent
- `apps/cli/src/commands/list.ts` — rpcCall → listAgents
- `apps/cli/src/commands/logs.ts` — rpcCall/rpcStream → getAgentLogs (HTTP polling)
- `apps/cli/src/commands/start.ts` — rpcCall → startAgent
- `apps/cli/src/commands/stop.ts` — rpcCall → stopAgent
- `apps/cli/src/commands/restart.ts` — rpcCall → restartAgent
- `apps/cli/src/commands/destroy.ts` — rpcCall → destroyAgent
- `apps/cli/src/commands/status.ts` — rpcCall → getAgent
- `apps/cli/src/commands/chat.ts` — rpcCall → chatWithAgent/applyCode/getAgent
- `apps/cli/src/commands/do.ts` — rpcCall → createAgent
- `apps/cli/src/commands/auto.ts` — rpcCall → createAgent
- `apps/cli/src/commands/dash.ts` — ensureDaemon → ensureServer
- `apps/cli/src/ui/Dashboard.tsx` — rpcCall → listAgents/startAgent/stopAgent/destroyAgent
- `apps/cli/src/ui/LogViewer.tsx` — rpcCall → getAgentLogs
- `apps/daemon/tsup.config.ts` — entry에서 src/index.ts 제거
- `apps/daemon/package.json` — "." export 제거, dev script 변경

### RPC → HTTP Mapping
| Old (Unix Socket RPC) | New (HTTP API) |
|----------------------|----------------|
| `rpcCall('agent.create', {...})` | `POST /api/agents` |
| `rpcCall('agent.list', {...})` | `GET /api/agents` |
| `rpcCall('agent.get', {id})` | `GET /api/agents/:id` |
| `rpcCall('agent.start', {id})` | `POST /api/agents/:id/start` |
| `rpcCall('agent.stop', {id})` | `POST /api/agents/:id/stop` |
| `rpcCall('agent.restart', {id})` | `POST /api/agents/:id/restart` |
| `rpcCall('agent.destroy', {id})` | `DELETE /api/agents/:id` |
| `rpcCall('agent.logs', {...})` | `GET /api/agents/:id/logs` |
| `rpcStream('agent.logs.stream', {...})` | HTTP polling (2s interval) |
| `rpcCall('agent.preview', {...})` | `POST /api/agents/preview` |
| `rpcCall('agent.chat', {...})` | `POST /api/agents/:id/chat` |
| `rpcCall('agent.apply', {...})` | `POST /api/agents/:id/apply` |
| `rpcCall('system.stats')` | `GET /api/system/status` |
| `rpcCall('system.health')` | `GET /api/system/health/detailed` |

## Architecture (Before → After)

### Before (v2.1)
```
CLI ──Unix Socket──> Daemon Process (spawned by CLI)
                         └── Engine + RPC Server
Web ──HTTP──> API Server
                  └── Engine (imported)
```

### After (v2.2)
```
CLI ──HTTP──> API Server (single process)
                  └── Engine (in-process)
Web ──HTTP──> API Server (same process)
```

## Metrics

- **Build**: 6/6 passed
- **Tests**: 351 passed, 34 files
- **Lines changed**: 636 added, 2,541 deleted (net -1,905 lines)
- **Files deleted**: 4
- **Files created**: 2
- **Files modified**: 16
- **Version**: 2.1.0 → 2.2.0

## What's Left

IPC protocol types (`packages/shared/src/ipc.ts`) are still present but unused by CLI. They can be removed in a future cleanup version. The daemon package now only exports engine.ts.
