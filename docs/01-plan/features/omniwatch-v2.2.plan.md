# OmniWatch v2.2 Plan — Complete Daemon Removal

## Summary

CLI의 Unix Socket RPC 통신을 HTTP API 호출로 전환.
독립 daemon 프로세스 완전 제거, 단일 API 서버로 통일.

## Current State (v2.1)

- API server: daemon engine 내장 (v2.0 완료)
- CLI: 여전히 daemon을 spawn하고 Unix Socket으로 통신
- 레거시: daemon/index.ts, rpc-server.ts 존재

## Target State (v2.2)

- CLI → HTTP API 호출 (localhost:3456)
- daemon spawn 제거
- rpc-server.ts, daemon/index.ts 삭제
- IPC protocol은 유지 (향후 제거 가능)

## Tasks

| # | Task | Description |
|---|------|-------------|
| 1 | Create api-client.ts | CLI HTTP 클라이언트 (apiFetch wrapper) |
| 2 | Migrate CLI commands | 12개 명령어 ipc-client → api-client |
| 3 | Remove daemon command | daemon start/stop/status 제거 |
| 4 | Delete legacy files | daemon/index.ts, rpc-server.ts |
| 5 | Update daemon build | tsup entry에서 index.ts 제거 |
| 6 | Update daemon exports | package.json에서 "." export 제거 |
