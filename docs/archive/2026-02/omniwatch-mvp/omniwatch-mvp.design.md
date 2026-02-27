# OmniWatch MVP Design Document

> **Summary**: CLI 기반 AI 에이전트 관리 플랫폼 - 3계층 아키텍처 상세 설계
>
> **Project**: OmniWatch
> **Version**: 0.1.0
> **Author**: Paul
> **Date**: 2026-02-27
> **Status**: Approved (v2 - CLI-first rewrite)
> **Planning Doc**: [omniwatch-mvp.plan.md](../../01-plan/features/omniwatch-mvp.plan.md)

---

## 1. System Architecture

### 1.1 3-Layer Architecture

```
┌────────────────────────────────────────────────────┐
│                  User (Terminal)                     │
└────────────────────┬───────────────────────────────┘
                     │
┌────────────────────▼───────────────────────────────┐
│  CLI Layer (omni)                                   │
│  ┌───────────┐ ┌──────────┐ ┌────────────────────┐ │
│  │ Commands  │ │ TUI/Ink  │ │ IPC Client         │ │
│  │ (Cmdr.js) │ │ Dashboard│ │ (Unix Socket)      │ │
│  └───────────┘ └──────────┘ └────────────────────┘ │
└────────────────────┬───────────────────────────────┘
                     │ Unix Domain Socket (JSON-RPC 2.0)
┌────────────────────▼───────────────────────────────┐
│  Daemon Layer (omnid)                               │
│  ┌────────────┐ ┌────────────┐ ┌────────────────┐  │
│  │ RPC Server │ │ Agent Mgr  │ │ Code Generator │  │
│  └────────────┘ └────────────┘ └────────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌────────────────┐  │
│  │ Health Mon │ │ Self-Healer│ │ Notifier       │  │
│  └────────────┘ └────────────┘ └────────────────┘  │
│  ┌────────────┐ ┌────────────┐                      │
│  │ Scheduler  │ │ DB (SQLite)│                      │
│  └────────────┘ └────────────┘                      │
└────────────────────┬───────────────────────────────┘
                     │ child_process.fork + IPC message
┌────────────────────▼───────────────────────────────┐
│  Agent Layer                                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │Agent A  │ │Agent B  │ │Agent C  │ │Agent N  │  │
│  │(Runtime)│ │(Runtime)│ │(Runtime)│ │(Runtime)│  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
└────────────────────────────────────────────────────┘
```

### 1.2 Process Lifecycle

```
$ omni watch "..."
    │
    ├─ 데몬 없으면 → omnid 자동 시작 (detached)
    │
    ├─ Unix Socket으로 JSON-RPC 요청 전송
    │   { method: "agent.create", params: { prompt: "..." } }
    │
    ├─ CLI에서 생성 과정 스트리밍 표시
    │   ⠋ Generating agent code...
    │   ⠋ Validating code...
    │   ⠋ Installing dependencies...
    │   ✓ Agent [coupang-airpods] created and running.
    │
    └─ CLI 종료. 데몬 + 에이전트는 계속 실행.
```

---

## 2. Project Structure

```
omniwatch/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
│
├── src/
│   ├── cli/                        # ═══ CLI Layer ═══
│   │   ├── index.ts                # 엔트리포인트 (#!/usr/bin/env node)
│   │   ├── commands/
│   │   │   ├── watch.ts            # omni watch "<prompt>"
│   │   │   ├── list.ts             # omni list
│   │   │   ├── logs.ts             # omni logs <id> [--follow]
│   │   │   ├── start.ts            # omni start <id>
│   │   │   ├── stop.ts             # omni stop <id>
│   │   │   ├── restart.ts          # omni restart <id>
│   │   │   ├── destroy.ts          # omni destroy <id>
│   │   │   ├── status.ts           # omni status <id>
│   │   │   ├── dash.ts             # omni dash
│   │   │   ├── config.ts           # omni config set/get/list
│   │   │   └── daemon.ts           # omni daemon start/stop/status
│   │   ├── ui/                     # Ink TUI 컴포넌트
│   │   │   ├── Dashboard.tsx       # 실시간 대시보드
│   │   │   ├── AgentCreation.tsx   # 에이전트 생성 과정 표시
│   │   │   └── components/
│   │   │       ├── StatusBadge.tsx
│   │   │       ├── LogViewer.tsx
│   │   │       └── AgentTable.tsx
│   │   └── ipc-client.ts           # Unix Socket 클라이언트
│   │
│   ├── daemon/                     # ═══ Daemon Layer ═══
│   │   ├── index.ts                # 데몬 엔트리포인트
│   │   ├── rpc-server.ts           # Unix Socket JSON-RPC 서버
│   │   ├── agent-manager.ts        # 에이전트 CRUD + 프로세스 관리
│   │   ├── code-generator.ts       # Claude API 코드 생성
│   │   ├── code-validator.ts       # AST 정적 분석
│   │   ├── health-monitor.ts       # Heartbeat 감시 + 자동 재시작
│   │   ├── self-healer.ts          # AI 기반 자가 치유
│   │   ├── notifier.ts             # 알림 발송
│   │   ├── scheduler.ts            # cron 스케줄러
│   │   └── handlers/               # JSON-RPC 핸들러
│   │       ├── agent.ts
│   │       ├── log.ts
│   │       └── system.ts
│   │
│   ├── agent/                      # ═══ Agent Runtime ═══
│   │   ├── runtime.ts              # 에이전트 프로세스 래퍼 (fork 대상)
│   │   ├── sdk.ts                  # omni.* SDK
│   │   └── templates/              # 코드 생성 시스템 프롬프트
│   │       └── base-prompt.ts
│   │
│   └── shared/                     # ═══ Shared ═══
│       ├── types.ts                # 공유 타입
│       ├── constants.ts            # 경로, 기본값
│       ├── config.ts               # config.toml 관리
│       ├── db.ts                   # SQLite 래퍼
│       ├── schema.ts               # DB 스키마
│       ├── logger.ts               # 구조화 로거
│       ├── errors.ts               # 커스텀 에러
│       └── ipc-protocol.ts         # JSON-RPC 메시지 타입
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
└── docs/
```

### Runtime Data Directory (`~/.omniwatch/`)

```
~/.omniwatch/
├── config.toml              # 전역 설정
├── omniwatch.db             # SQLite 데이터베이스
├── omnid.pid                # 데몬 PID
├── omnid.sock               # Unix Domain Socket
├── agents/                  # 에이전트별 디렉토리
│   ├── agent-a1b2c3d4/
│   │   ├── index.js         # 생성된 에이전트 코드
│   │   ├── package.json     # 의존성
│   │   └── node_modules/
│   └── agent-e5f6g7h8/
└── logs/
    └── daemon.log
```

---

## 3. Data Model

### 3.1 Database Schema (SQLite)

```sql
-- 에이전트 정의
CREATE TABLE agents (
  id          TEXT PRIMARY KEY,        -- 'agent-' + nanoid(8)
  name        TEXT NOT NULL,           -- 자동 생성 또는 사용자 지정
  prompt      TEXT NOT NULL,           -- 원본 자연어 프롬프트
  description TEXT,                    -- AI가 생성한 설명
  status      TEXT NOT NULL DEFAULT 'creating',
              -- creating | ready | running | stopped | error | healing | destroyed
  code_hash   TEXT,                    -- 생성 코드 SHA256
  schedule    TEXT,                    -- cron 표현식 (null = 상시)
  config      TEXT DEFAULT '{}',       -- JSON: interval, timeout, retryCount, env
  pid         INTEGER,                 -- 현재 프로세스 PID
  heal_count  INTEGER DEFAULT 0,       -- 자가 치유 횟수
  error_count INTEGER DEFAULT 0,       -- 누적 에러 횟수
  last_run_at TEXT,
  last_error  TEXT,                    -- 마지막 에러 메시지
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 에이전트 로그
CREATE TABLE agent_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id    TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  level       TEXT NOT NULL,           -- debug | info | warn | error
  message     TEXT NOT NULL,
  metadata    TEXT,                    -- JSON
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_logs_agent_time ON agent_logs(agent_id, created_at DESC);

-- 알림 기록
CREATE TABLE notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id    TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL,           -- webhook | terminal | system
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  severity    TEXT DEFAULT 'info',     -- critical | warning | info
  status      TEXT DEFAULT 'sent',     -- sent | failed
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 에이전트 KV 저장소 (omni.store용)
CREATE TABLE agent_store (
  agent_id    TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  value       TEXT,                    -- JSON serialized
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (agent_id, key)
);
```

### 3.2 Agent Status State Machine

```
                    omni watch "..."
                         │
                         ▼
                   ┌──────────┐
                   │ CREATING │ → Claude API 호출
                   └────┬─────┘
                        │ 코드 생성 + 검증 + 설치 완료
                        ▼
                   ┌──────────┐     omni stop
         ┌────────│  READY   │◄──────────────┐
         │        └────┬─────┘               │
         │             │ omni start           │
         │             ▼                      │
         │        ┌──────────┐               │
         │   ┌───▶│ RUNNING  │───────────────┘
         │   │    └────┬─────┘      정상 종료
         │   │         │ 에러 발생
         │   │         ▼
         │   │    ┌──────────┐
         │   │    │  ERROR   │
         │   │    └────┬─────┘
         │   │         │ heal_count < 3
         │   │         ▼
         │   │    ┌──────────┐
         │   │    │ HEALING  │ → AI 코드 수정
         │   │    └────┬─────┘
         │   │         │ 수정 성공
         │   └─────────┘
         │
         │  omni destroy
         ▼
    ┌───────────┐
    │ DESTROYED │
    └───────────┘
```

---

## 4. IPC Protocol (JSON-RPC 2.0)

### 4.1 Socket Path

```
~/.omniwatch/omnid.sock
```

### 4.2 RPC Methods

| Method | Params | Description |
|--------|--------|-------------|
| `agent.create` | `{ prompt, options? }` | 에이전트 생성 (AI 코드 생성 → 실행) |
| `agent.list` | `{ status?, limit? }` | 에이전트 목록 |
| `agent.get` | `{ id }` | 에이전트 상세 |
| `agent.start` | `{ id }` | 에이전트 시작 |
| `agent.stop` | `{ id }` | 에이전트 중지 |
| `agent.restart` | `{ id }` | 에이전트 재시작 |
| `agent.destroy` | `{ id }` | 에이전트 삭제 |
| `agent.logs` | `{ id, limit?, level? }` | 로그 조회 |
| `agent.logs.stream` | `{ id }` | 로그 실시간 스트리밍 |
| `system.stats` | `{}` | 시스템 통계 |
| `system.health` | `{}` | 데몬 헬스체크 |
| `daemon.stop` | `{}` | 데몬 종료 |

### 4.3 Message Format

```typescript
// Request
interface RPCRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: Record<string, unknown>;
}

// Response
interface RPCResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

// Streaming (agent.create, agent.logs.stream)
interface RPCNotification {
  jsonrpc: '2.0';
  method: 'stream';
  params: { type: string; data: unknown };
}
```

---

## 5. Agent Runtime

### 5.1 Runtime Wrapper

```typescript
// src/agent/runtime.ts (fork 대상)
// 1. Agent SDK 초기화
// 2. 에이전트 코드 로드 및 실행
// 3. Heartbeat 전송 (10초마다)
// 4. uncaughtException 포착 → 데몬에 보고
// 5. SIGTERM → graceful shutdown
```

### 5.2 Agent SDK API

```typescript
interface OmniSDK {
  // HTTP 요청
  fetch(url: string, options?: RequestInit): Promise<Response>;

  // 알림 발송 (데몬 경유)
  notify(message: string, options?: { title?: string; severity?: string }): Promise<void>;

  // KV 저장소
  store: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
  };

  // 구조화 로깅
  log: {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
  };
}
```

### 5.3 Generated Agent Code Structure

```javascript
// AI가 생성하는 에이전트 코드의 표준 구조
// @dependencies: axios, cheerio

export default async function agent(omni) {
  const CHECK_INTERVAL = 60_000; // 1분

  async function check() {
    try {
      const response = await omni.fetch('https://...');
      const data = parseResponse(response);

      const lastValue = await omni.store.get('lastValue');

      if (shouldNotify(data, lastValue)) {
        await omni.notify(`조건 충족: ${data.value}`, {
          title: 'Price Alert',
          severity: 'info'
        });
      }

      await omni.store.set('lastValue', data.value);
      omni.log.info(`Checked: ${data.value}`);
    } catch (err) {
      omni.log.error(`Check failed: ${err.message}`);
      throw err; // 런타임이 포착하여 데몬에 보고
    }
  }

  // 초기 실행
  await check();

  // 주기적 실행
  setInterval(check, CHECK_INTERVAL);
}
```

---

## 6. Self-Healing Design

```
에이전트 에러 발생
    │
    ▼
데몬: health-monitor가 에러 감지
    │
    ├─ heal_count >= 3 → ERROR 상태 고정 + 사용자 알림
    │
    └─ heal_count < 3 → self-healer 호출
        │
        ▼
    self-healer:
    1. 실패한 에이전트의 코드 + 에러 메시지 수집
    2. 대상 URL 재 fetch (HTML 변경 확인)
    3. Claude API 호출:
       "이 에이전트 코드가 아래 에러로 실패했습니다.
        현재 대상 페이지 HTML은 다음과 같습니다.
        코드를 수정해주세요."
    4. 수정된 코드 검증 (code-validator)
    5. 코드 교체 + 에이전트 재시작
    6. heal_count += 1
    7. 성공 시 사용자에게 "자가 치유 완료" 알림
```

---

## 7. Key Code Generation Prompt

```
You are an agent code generator for OmniWatch.
Generate a self-contained Node.js monitoring script.

## Available SDK
- omni.fetch(url, options?) - HTTP request
- omni.notify(message, { title?, severity? }) - Send notification
- omni.store.get/set/delete(key, value?) - Persistent KV storage
- omni.log.info/warn/error(message, meta?) - Structured logging

## Rules
1. Export a default async function that receives `omni` SDK
2. Use omni.fetch() instead of raw axios/fetch for HTTP
3. Use omni.store for state persistence between runs
4. Use omni.notify() when conditions are met
5. Handle errors with try/catch, let uncaught errors propagate to runtime
6. Use setInterval for periodic checks
7. Only use whitelisted packages: axios, cheerio, dayjs, lodash
8. Never use: fs, child_process, eval, Function, process.exit, require

## Target URL HTML (if applicable)
{FETCHED_HTML_SNIPPET}

## User Request
{USER_PROMPT}
```

---

## 8. Error Handling

| Error Code | Name | Description |
|------------|------|-------------|
| `DAEMON_NOT_RUNNING` | 데몬 미실행 | CLI가 데몬에 연결 실패 |
| `AGENT_NOT_FOUND` | 에이전트 없음 | 요청한 ID가 존재하지 않음 |
| `AGENT_ALREADY_RUNNING` | 이미 실행 중 | 실행 중인 에이전트 start 시도 |
| `GENERATION_FAILED` | 생성 실패 | AI 코드 생성 실패 |
| `VALIDATION_FAILED` | 검증 실패 | 생성 코드가 안전성 검증 통과 못함 |
| `INSTALL_FAILED` | 설치 실패 | npm 의존성 설치 실패 |
| `HEAL_EXHAUSTED` | 치유 한도 초과 | Self-healing 3회 모두 실패 |

---

## 9. Test Plan

| Type | Target | Tool |
|------|--------|------|
| Unit | code-validator, schema, config | vitest |
| Unit | agent-manager, health-monitor | vitest |
| Integration | CLI → Daemon IPC 왕복 | vitest |
| Integration | 에이전트 생성 → 실행 → 로그 수집 | vitest |
| E2E | `omni watch "..."` 전체 흐름 | vitest + child_process |

---

## 10. Implementation Order

| # | Task | Layer | Dependency |
|---|------|-------|------------|
| 1 | shared/types, constants, errors | Shared | - |
| 2 | shared/db + schema (SQLite) | Shared | 1 |
| 3 | shared/config (config.toml) | Shared | 1 |
| 4 | shared/ipc-protocol | Shared | 1 |
| 5 | daemon/index (프로세스 시작/PID) | Daemon | 1-3 |
| 6 | daemon/rpc-server | Daemon | 4-5 |
| 7 | cli/index + ipc-client | CLI | 4 |
| 8 | cli/commands/daemon | CLI | 6-7 |
| 9 | daemon/agent-manager (CRUD) | Daemon | 2,6 |
| 10 | cli/commands/list, status | CLI | 7,9 |
| 11 | agent/runtime + sdk | Agent | 1,2 |
| 12 | daemon/code-generator (Claude) | Daemon | 9 |
| 13 | daemon/code-validator (AST) | Daemon | 12 |
| 14 | cli/commands/watch | CLI | 7,12,13 |
| 15 | daemon/agent-manager (fork/start) | Daemon | 9,11 |
| 16 | cli/commands/start,stop,restart,destroy | CLI | 7,15 |
| 17 | cli/commands/logs | CLI | 7,9 |
| 18 | daemon/health-monitor | Daemon | 15 |
| 19 | daemon/self-healer | Daemon | 12,13,18 |
| 20 | daemon/notifier (webhook) | Daemon | 9 |
| 21 | cli/ui/Dashboard (Ink) | CLI | 7 |
| 22 | cli/commands/dash | CLI | 21 |
| 23 | cli/commands/config | CLI | 3,7 |
| 24 | Tests | All | All |

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-27 | Initial (Web 기반) | Paul |
| 0.2 | 2026-02-27 | CLI-first 전면 재작성 | Paul |
