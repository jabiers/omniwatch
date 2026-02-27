# OmniWatch v0.2 Planning Document

> **Summary**: MVP 이후 기능 확장 - TUI Dashboard, 알림 플러그인, 대화형 모드, 코드 품질 개선
>
> **Project**: OmniWatch
> **Version**: 0.2.0
> **Author**: Paul
> **Date**: 2026-02-27
> **Status**: Draft
> **Previous**: [omniwatch-mvp (archived)](../../archive/2026-02/omniwatch-mvp/)

---

## 1. Overview

### 1.1 Purpose

v0.1 MVP에서 CLI 핵심 기능(에이전트 생성/관리/자가치유)이 완성되었다.
v0.2는 사용성과 알림 확장에 집중한다:
- TUI 대시보드로 실시간 모니터링 경험 제공
- Slack/Discord/Telegram 알림으로 외부 연동 확장
- 대화형 모드(`omni chat`)로 에이전트와 자연어 상호작용
- AST 기반 코드 검증으로 보안 강화

### 1.2 Background

- v0.1 MVP PDCA 완료 (Match Rate 90%, 33 source files, 51 tests)
- Deferred items: TUI Dashboard (FR-07), Code preview (FR-16)
- Plan v0.2 items: Slack/Telegram/Discord 알림, 대화형 인터랙티브 모드
- Code quality: AST 기반 검증 (regex → acorn 전환)

---

## 2. Scope

### 2.1 In Scope (v0.2)

| # | Feature | Category | Priority |
|---|---------|----------|----------|
| 1 | TUI Dashboard (`omni dash`) | UX | High |
| 2 | Slack 알림 플러그인 | Notification | High |
| 3 | Discord 알림 플러그인 | Notification | Medium |
| 4 | Telegram 알림 플러그인 | Notification | Medium |
| 5 | `omni chat <id>` 대화형 모드 | UX | High |
| 6 | AST 기반 코드 검증 (acorn) | Security | Medium |
| 7 | 생성 코드 미리보기 + 사용자 확인 | UX | Medium |
| 8 | 에이전트 템플릿 프리셋 | DX | Low |

### 2.2 Out of Scope (v0.3+)

- 웹 대시보드 (Next.js) → v0.3
- Agent-to-Agent 이벤트 버스 → v0.3
- Agent Marketplace → v0.4
- Docker 컨테이너 샌드박스 → v0.3
- PostgreSQL 마이그레이션 → 필요 시

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| **A. TUI Dashboard** | | |
| FR-01 | `omni dash` 명령으로 Ink 기반 TUI 대시보드 진입 | High |
| FR-02 | 실시간 에이전트 상태 테이블 (이름, 상태, PID, 마지막 실행) | High |
| FR-03 | 에이전트 선택 시 실시간 로그 뷰어 | High |
| FR-04 | 키보드 단축키: q(종료), r(새로고침), s(start), x(stop), d(destroy) | Medium |
| FR-05 | 시스템 통계 헤더 (에이전트 수, 메모리, 업타임) | Medium |
| **B. 알림 플러그인** | | |
| FR-06 | Slack Webhook 알림 발송 (Incoming Webhook URL) | High |
| FR-07 | Discord Webhook 알림 발송 (embed 형식) | Medium |
| FR-08 | Telegram Bot API 알림 발송 (chat_id + token) | Medium |
| FR-09 | `omni config set notification.slack_webhook <url>` 로 설정 | High |
| FR-10 | 채널별 severity 필터링 (critical만, warning 이상 등) | Medium |
| FR-11 | 알림 플러그인 시스템 (채널 추가 용이한 구조) | Medium |
| **C. 대화형 모드** | | |
| FR-12 | `omni chat <id>` 로 에이전트와 대화형 상호작용 | High |
| FR-13 | 자연어로 에이전트 동작 수정 ("체크 주기를 5분으로 변경해줘") | High |
| FR-14 | 에이전트 상태/로그 자연어 질의 ("마지막 에러가 뭐야?") | Medium |
| FR-15 | 코드 수정 후 자동 재시작 (confirm 후) | High |
| **D. 코드 품질** | | |
| FR-16 | AST 기반 코드 검증 (acorn parser) | Medium |
| FR-17 | watch 명령에서 생성 코드 미리보기 + 사용자 확인(y/n) | Medium |
| FR-18 | 에이전트 프리셋 템플릿 (`--template web-monitor`) | Low |

### 3.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| Performance | TUI 대시보드 refresh < 500ms |
| Performance | 알림 발송 < 3초 |
| Usability | chat 모드 응답 < 10초 (AI 호출 포함) |
| Extensibility | 새 알림 채널 추가 시 1파일만 작성 |
| Backward Compat | v0.1 config/DB와 100% 호환 |

---

## 4. Architecture Changes

### 4.1 New Dependencies

| Package | Purpose | Size Impact |
|---------|---------|-------------|
| ink | TUI 대시보드 렌더링 | ~200KB |
| ink-table | 에이전트 테이블 컴포넌트 | ~10KB |
| react | Ink 의존성 | included with ink |
| acorn | AST 파싱 (코드 검증) | ~130KB |

### 4.2 New Files

```
src/
├── cli/
│   ├── commands/
│   │   ├── dash.ts              # NEW: TUI 대시보드 진입
│   │   └── chat.ts             # NEW: 대화형 모드
│   └── ui/                      # NEW: Ink TUI 컴포넌트
│       ├── Dashboard.tsx
│       ├── AgentTable.tsx
│       ├── LogViewer.tsx
│       ├── StatusBar.tsx
│       └── ChatInterface.tsx
├── daemon/
│   ├── notifier.ts              # MODIFY: 플러그인 시스템으로 리팩토링
│   ├── notification-channels/   # NEW: 알림 채널 플러그인
│   │   ├── index.ts             # 채널 레지스트리
│   │   ├── webhook.ts           # 기존 webhook (리팩토링)
│   │   ├── slack.ts             # NEW
│   │   ├── discord.ts           # NEW
│   │   ├── telegram.ts          # NEW
│   │   └── system.ts            # 기존 macOS 알림 (리팩토링)
│   ├── code-validator.ts        # MODIFY: regex → AST
│   └── chat-handler.ts          # NEW: 대화형 모드 핸들러
└── agent/
    └── templates/               # NEW: 에이전트 프리셋
        ├── base-prompt.ts
        ├── web-monitor.ts
        ├── api-checker.ts
        └── rss-watcher.ts
```

### 4.3 Config Schema Extension

```typescript
interface OmniConfig {
  // ... existing v0.1 fields
  notification: {
    webhook_url: string;      // existing
    system: boolean;          // existing
    // NEW v0.2
    slack_webhook: string;
    discord_webhook: string;
    telegram_token: string;
    telegram_chat_id: string;
    channels: {               // 채널별 severity 필터
      slack?: { min_severity: 'info' | 'warning' | 'critical' };
      discord?: { min_severity: 'info' | 'warning' | 'critical' };
      telegram?: { min_severity: 'info' | 'warning' | 'critical' };
    };
  };
}
```

### 4.4 New RPC Methods

| Method | Params | Description |
|--------|--------|-------------|
| `agent.chat` | `{ id, message }` | 에이전트 대화형 상호작용 |
| `agent.preview` | `{ prompt }` | 코드 생성 미리보기 (실행 없음) |
| `agent.apply` | `{ id, code }` | 수정된 코드 적용 + 재시작 |

---

## 5. Implementation Order

| # | Task | Layer | Dependency | Estimate |
|---|------|-------|------------|----------|
| 1 | Notification plugin system refactor | Daemon | - | 1h |
| 2 | Slack channel | Daemon | 1 | 30m |
| 3 | Discord channel | Daemon | 1 | 30m |
| 4 | Telegram channel | Daemon | 1 | 30m |
| 5 | Config schema extension | Shared | - | 30m |
| 6 | AST code validator (acorn) | Daemon | - | 1h |
| 7 | Code preview RPC | Daemon | - | 30m |
| 8 | watch command preview step | CLI | 7 | 30m |
| 9 | Agent templates | Agent | - | 1h |
| 10 | Ink setup + Dashboard.tsx | CLI | - | 2h |
| 11 | AgentTable + StatusBar | CLI | 10 | 1h |
| 12 | LogViewer (real-time) | CLI | 10 | 1h |
| 13 | dash command | CLI | 10-12 | 30m |
| 14 | chat-handler RPC | Daemon | - | 1h |
| 15 | ChatInterface.tsx or readline | CLI | 14 | 1h |
| 16 | chat command | CLI | 14,15 | 30m |
| 17 | Tests | All | All | 2h |

**Total estimate: ~13h**

---

## 6. Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Ink + TSX 빌드 복잡성 | Medium | tsup JSX 설정, 별도 entry point |
| Slack/Discord API 변경 | Low | Webhook은 안정적 API, 변경 희박 |
| chat 모드 AI 비용 | Medium | 짧은 컨텍스트, haiku 모델 사용 |
| AST 파서 성능 | Low | acorn은 매우 빠름 (수 ms) |
| TUI와 headless 서버 호환 | Medium | `omni dash`는 선택적, 핵심 CLI는 영향 없음 |

---

## 7. Success Criteria

- [ ] `omni dash`로 실시간 TUI 대시보드 표시
- [ ] Slack/Discord/Telegram 중 1개 이상에 실제 알림 발송
- [ ] `omni chat <id>`로 에이전트 동작 자연어 수정
- [ ] AST 기반 코드 검증이 regex보다 정확한 케이스 확인
- [ ] v0.1 기존 기능 100% 호환 (regression 없음)
- [ ] `omni watch "..." --preview`로 코드 미리보기 후 확인

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-27 | Initial v0.2 plan | Paul |
