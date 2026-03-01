# OmniWatch v2.0 Plan — Daemon-API Integration

## Context
현재 데몬(Unix Socket RPC)과 API(Hono HTTP)가 별도 프로세스로 실행됨.
매 API 요청마다 새 소켓 연결 생성 → 불필요한 IPC 오버헤드.
단일 프로세스로 통합하여 아키텍처 단순화.

## Scope
데몬의 핵심 엔진을 API 프로세스에 내장하여 단일 서버로 통합.

## Architecture Change
```
Before:  [API] --Unix Socket--> [Daemon] --fork--> [Agents]
After:   [API + Engine] --fork--> [Agents]
```

## Tasks

### 1. Daemon Engine Export
- `apps/daemon/src/engine.ts` 생성: 핸들러 + 초기화 함수 re-export
- `apps/daemon/tsup.config.ts`: engine entry point 추가
- `apps/daemon/package.json`: `"./engine"` export 추가

### 2. API Engine Integration
- `apps/api/package.json`: `@omniwatch/daemon` 의존성 추가
- `apps/api/src/engine.ts` 생성: 데몬 초기화 로직 (헬스 모니터, 스케줄러, etc.)
- `apps/api/src/index.ts`: 엔진 초기화 호출, ensureDaemon() 제거

### 3. API Routes 마이그레이션 (rpcCall → 직접 호출)
- `routes/agents.ts`: agent.create/destroy/start/stop/restart
- `routes/chat.ts`: agent.chat/preview/apply
- `routes/snapshots.ts`: snapshot.capture/restore
- `routes/mesh.ts`: mesh.topology
- `routes/queue.ts`: queue.stats/deadLetters/retryDeadLetter
- `routes/analytics.ts`: analytics.*/security.events
- `routes/recipes.ts`: agent.create
- `routes/marketplace.ts`: agent.create
- `routes/mcp.ts`: agent.*/snapshot.capture

### 4. Cleanup
- `apps/api/src/lib/rpc-bridge.ts` 삭제
- `isDaemonRunning()` 가드 제거 (엔진 내장이므로 항상 실행 중)
- `routes/system.ts` 업데이트: daemonRunning=true, daemonPid=process.pid

### 5. Verification
- `pnpm build` 전체 빌드
- `npx vitest run` 테스트 통과
- Gap Analysis 문서 생성
