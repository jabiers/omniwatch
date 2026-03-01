# OmniWatch v2.3 Plan — IPC Protocol Cleanup

## Summary

v2.2에서 CLI의 RPC 사용이 제거되었으므로, 더 이상 사용되지 않는 IPC 프로토콜 코드를 완전 제거.

## Tasks

| # | Task | Description |
|---|------|-------------|
| 1 | Delete ipc-protocol.ts | JSON-RPC 2.0 함수 파일 삭제 |
| 2 | Remove RPC types | RPCRequest, RPCResponse, RPCError, RPCNotification 타입 제거 |
| 3 | Remove SOCKET_PATH, PID_FILE | 더 이상 사용하지 않는 상수 제거 |
| 4 | Clean shared exports | index.ts에서 IPC 관련 export 제거 |
| 5 | Remove PID_FILE from engine | 엔진 라이프사이클에서 PID 파일 관리 제거 |
| 6 | Clean log handler | Socket 기반 스트리밍 제거 (broadcastLogEntry, streamLogs) |
| 7 | Delete ipc-protocol.test.ts | 테스트 파일 삭제 |
| 8 | Update constants.test.ts | SOCKET_PATH 테스트 제거 |
