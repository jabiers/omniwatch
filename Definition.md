# Vigil - System Definition

## 1. System Identity

Vigil는 CLI 기반 AI 네이티브 자율형 에이전트 관리 플랫폼이다.
사용자가 터미널에서 자연어 한 줄을 입력하면, AI가 독립된 백그라운드 프로그램(Agent)을
자동 생성하고 24시간 실행, 감시, 자가 치유한다.

- **형태**: CLI 도구 (OpenCode, Claude Code와 같은 터미널 네이티브 프로그램)
- **핵심 가치**: "Don't Config, Just Speak" - 설정하지 마세요, 말하세요.
- **정체성**: AI가 코드를 짜고, 실행하고, 고치는 **에이전트 공장(Agent Factory)** + **지능형 파수꾼(Sentinel)**

```
$ vigil watch "쿠팡에서 에어팟 프로 25만원 이하면 알려줘"
Agent [coupang-airpods] created and running.

$ vigil list
ID              NAME                  STATUS    LAST CHECK
agent-a1b2      coupang-airpods       running   30s ago
agent-c3d4      btc-price-alert       running   10s ago
agent-e5f6      hackernews-ai         running   2m ago
```

---

## 2. Architecture

3계층 아키텍처: CLI(사용자) → Daemon(상주 관리자) → Agents(독립 프로세스)

```
[Terminal]
    │
    ▼
[CLI: vigil] ──Unix Socket──▶ [Daemon: vigild] ──fork──▶ [Agent A]
                                    │                    [Agent B]
                                    │                    [Agent N]
                                    ▼
                              [SQLite DB]
```

- **CLI (`vigil`)**: 경량 클라이언트. 명령 전달 후 종료. 터미널을 닫아도 에이전트는 유지.
- **Daemon (`vigild`)**: 백그라운드 상주. 에이전트 수명주기, 헬스체크, 알림, AI 호출 담당.
- **Agent**: `child_process.fork`로 실행되는 독립 Node.js 프로세스. 각자의 디렉토리와 의존성을 가짐.

---

## 3. Key Requirements

### A. The Factory (AI 에이전트 제조)

1. **Prompt-to-Code**: 자연어 → Claude API → 실행 가능한 Node.js 에이전트 코드 자동 생성
2. **Code Validation**: AST 정적 분석으로 금지 API 사용, 무한루프, 보안 위험 탐지
3. **Auto-Install**: 에이전트가 필요로 하는 npm 패키지 자동 설치 (허용 목록 기반)
4. **Live Preview**: 생성된 코드를 실행 전 사용자에게 보여주고 확인

### B. The Runner (에이전트 실행)

1. **Custom Daemon**: `child_process.fork` 기반 커스텀 프로세스 매니저 (PM2 의존 제거)
2. **Agent SDK**: 에이전트가 사용하는 표준 API (`vigil.fetch`, `vigil.notify`, `vigil.store`)
3. **Heartbeat**: 에이전트 → 데몬 주기적 생존 신호. 응답 없으면 자동 재시작
4. **Resource Limit**: 에이전트당 메모리 128MB 제한, 동시 최대 20개

### C. The Sentinel (관제 및 자가 치유)

1. **Self-Healing (MVP 필수)**: 에이전트 실패 시 에러를 AI에게 전달 → 코드 자동 수정 → 재실행
2. **Contextual Alerting**: 단순 에러가 아닌, AI가 원인과 맥락을 요약한 알림
3. **Multi-Channel**: Webhook, Slack, Telegram, 시스템 알림, 터미널 알림 지원
4. **Smart Throttle**: 심각도별 알림 빈도 조절 (critical=즉시, info=일괄)

### D. The Console (CLI + TUI)

1. **Command Mode**: `vigil watch/list/logs/stop/start` 등 원샷 명령
2. **Interactive Mode**: `vigil chat` 대화형 에이전트 생성/관리
3. **Dashboard Mode**: `vigil dash` 실시간 TUI 대시보드 (Ink 기반)
4. **Log Streaming**: `vigil logs <id> --follow` 실시간 로그 스트리밍

### E. The Foundation (인프라)

1. **SQLite**: 단일 파일 DB. 에이전트 메타, 로그, 알림 이력, KV 저장소
2. **Unix Domain Socket**: CLI ↔ Daemon IPC (JSON-RPC 2.0)
3. **Config**: `~/.vigil/config.toml` 전역 설정
4. **Plugin System**: 알림 채널, 데이터 소스, 에이전트 템플릿 확장

---

## 4. Agent Types

| 유형 | 명령어 | 설명 | 예시 |
|------|--------|------|------|
| **Watcher** | `vigil watch` | 조건 감시 → 충족 시 알림 | 가격, 주가, 웹 변경, 뉴스 |
| **Doer** | `vigil do` | 주기적/단발 작업 실행 | 리포트 생성, 데이터 수집, 백업 |
| **Auto** | `vigil auto` | 자율 판단 에이전트 | 이상 탐지, 원인 분석, 자동 대응 |

---

## 5. Tech Stack

| 영역 | 기술 |
|------|------|
| Language | TypeScript 5.x + Node.js 20 LTS |
| CLI | Commander.js |
| TUI | Ink (React for Terminal) |
| AI | @anthropic-ai/sdk (Claude) |
| DB | SQLite (better-sqlite3) |
| IPC | Unix Domain Socket (JSON-RPC 2.0) |
| Process | child_process.fork (커스텀 데몬) |
| Validation | zod |
| Build | tsup (esbuild 기반) |
| Test | vitest |
| Package | pnpm |

---

## 6. Distribution

- **v0.1**: `npm i -g vigil` (npm global package)
- **v0.2+**: Homebrew, 바이너리 릴리즈
- **License**: MIT (오픈소스)
