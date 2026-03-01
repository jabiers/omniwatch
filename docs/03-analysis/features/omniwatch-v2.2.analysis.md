# OmniWatch v2.2 Gap Analysis — Complete Daemon Removal

## Summary

CLI의 Unix Socket RPC 통신을 HTTP API로 전환, 독립 daemon 프로세스 완전 제거.

## Implementation Checklist

| Task | Status |
|------|--------|
| Create api-client.ts (HTTP wrapper) | Done |
| Create server.ts (ensureServer) | Done |
| Migrate watch command | Done |
| Migrate list command | Done |
| Migrate logs command (+ polling follow) | Done |
| Migrate start command | Done |
| Migrate stop command | Done |
| Migrate restart command | Done |
| Migrate destroy command | Done |
| Migrate status command | Done |
| Migrate chat command | Done |
| Migrate do command | Done |
| Migrate auto command | Done |
| Migrate dash command (TUI) | Done |
| Migrate Dashboard.tsx (TUI) | Done |
| Migrate LogViewer.tsx (TUI) | Done |
| Delete daemon/index.ts | Done |
| Delete daemon/rpc-server.ts | Done |
| Delete cli/ipc-client.ts | Done |
| Delete cli/commands/daemon.ts | Done |
| Update daemon tsup.config.ts | Done |
| Update daemon package.json exports | Done |
| Replace daemon command with server command | Done |
| Version bump to 2.2.0 | Done |

## Verification

| Check | Result |
|-------|--------|
| `pnpm build` | 6/6 packages passed |
| `npx vitest run` | 351 tests, 34 files passed |
| `ipc-client` references in cli | 0 remaining |
| `rpc-server` references in daemon | 0 remaining |
| `ensureDaemon` references | 0 remaining |
| `rpcCall`/`rpcStream` references | 0 remaining |
| daemon/index.ts exists | No (deleted) |
| daemon/rpc-server.ts exists | No (deleted) |

## Match Rate

**100%** — All planned tasks implemented and verified.
