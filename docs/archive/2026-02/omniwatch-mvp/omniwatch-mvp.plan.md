# Vigil MVP Planning Document

> **Summary**: CLI 기반 AI 네이티브 자율형 에이전트 관리 플랫폼 MVP
>
> **Project**: Vigil
> **Version**: 0.1.0
> **Author**: Paul
> **Date**: 2026-02-27
> **Status**: Approved (v2 - CLI-first rewrite)

---

## 1. Overview

### 1.1 Purpose

Vigil는 터미널에서 자연어 한 줄로 모니터링/자동화 에이전트를 생성하고,
백그라운드 데몬이 24시간 실행, 감시, 자가 치유하는 CLI 도구이다.

### 1.2 Background

- Claude Code, OpenCode 같은 CLI AI 도구의 성공이 CLI-first 접근의 가능성을 증명
- 기존 자동화 도구(Huginn, n8n, Make.com)는 웹 UI 기반으로 개발자 친화적이지 않음
- AI 코드 생성 + 자가 치유가 결합되면 "쓰고 버리는 스크립트"가 "영구 동작하는 에이전트"가 됨
- 핵심 차별점: 자연어 에이전트 생성 + Self-Healing + CLI 네이티브

### 1.3 Key Insight from Brainstorming

4개 전문 에이전트의 브레인스토밍 결과 핵심 합의:

1. **CLI-first, Web 나중**: MVP에서 웹 대시보드 제거. TUI로 충분
2. **단일 패키지**: 모노레포 불필요. 1인 개발에 최적화
3. **커스텀 데몬**: PM2 의존 제거. child_process.fork 기반 자체 프로세스 관리
4. **Self-Healing은 MVP 필수**: 없으면 AI 코드 생성의 가치가 없음
5. **PoC 우선**: 에이전트 하나를 실제로 만들어서 동작 확인이 선행되어야 함

---

## 2. Scope

### 2.1 In Scope (v0.1 MVP)

- [x] CLI 명령어 체계 (`vigil watch/list/logs/stop/start/dash`)
- [x] 백그라운드 데몬 (`vigild`) + Unix Socket IPC
- [x] AI 에이전트 코드 생성 (Claude API)
- [x] 에이전트 독립 프로세스 실행 (child_process.fork)
- [x] 코드 유효성 검증 (AST 정적 분석)
- [x] Self-Healing 기본 (에러 → AI 코드 수정 → 재실행)
- [x] 기본 알림 (터미널 + Webhook)
- [x] SQLite 데이터 저장
- [x] TUI 대시보드 (Ink 기반)

### 2.2 Out of Scope (v0.2+)

- 웹 대시보드 (Next.js) → v0.3
- Slack/Telegram/Discord 알림 플러그인 → v0.2
- Agent Marketplace → v0.4
- Agent-to-Agent 이벤트 버스 → v0.3
- 대화형 인터랙티브 모드 (`vigil chat`) → v0.2
- PostgreSQL 마이그레이션 → 필요 시
- Docker 컨테이너 샌드박스 → v0.3

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| **A. CLI** | | | |
| FR-01 | `vigil watch "<prompt>"` - 자연어로 에이전트 생성 및 실행 | Critical | Pending |
| FR-02 | `vigil list` - 에이전트 목록 조회 (상태, 마지막 체크 시간) | Critical | Pending |
| FR-03 | `vigil logs <id> [--follow]` - 에이전트 로그 조회/스트리밍 | High | Pending |
| FR-04 | `vigil stop/start/restart <id>` - 에이전트 제어 | Critical | Pending |
| FR-05 | `vigil status <id>` - 에이전트 상세 상태 | High | Pending |
| FR-06 | `vigil destroy <id>` - 에이전트 삭제 | High | Pending |
| FR-07 | `vigil dash` - TUI 실시간 대시보드 | Medium | Pending |
| FR-08 | `vigil config set/get` - 설정 관리 | High | Pending |
| **B. Daemon** | | | |
| FR-09 | 백그라운드 데몬 자동 시작/종료 | Critical | Pending |
| FR-10 | Unix Domain Socket JSON-RPC 서버 | Critical | Pending |
| FR-11 | 에이전트 Heartbeat 모니터링 + 자동 재시작 | High | Pending |
| FR-12 | 데몬 재시작 시 에이전트 상태 복구 | High | Pending |
| **C. Factory** | | | |
| FR-13 | Claude API로 자연어 → Node.js 에이전트 코드 생성 | Critical | Pending |
| FR-14 | AST 기반 코드 유효성 검증 | High | Pending |
| FR-15 | 에이전트 npm 의존성 자동 설치 | High | Pending |
| FR-16 | 생성 코드 미리보기 + 사용자 확인 | High | Pending |
| **D. Sentinel** | | | |
| FR-17 | Self-Healing: 에러 → AI 코드 수정 → 재실행 (최대 3회) | Critical | Pending |
| FR-18 | Webhook 알림 발송 | High | Pending |
| FR-19 | 터미널/시스템 알림 | Medium | Pending |
| **E. Foundation** | | | |
| FR-20 | SQLite DB (agents, logs, notifications, kv_store) | Critical | Pending |
| FR-21 | 설정 파일 관리 (~/.vigil/config.toml) | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| Performance | 에이전트 생성 < 15초 (AI 호출 포함) |
| Performance | CLI 명령 응답 < 200ms (데몬 IPC) |
| Scalability | 동시 20개 에이전트 가동 |
| Security | 생성 코드 AST 정적 분석, 금지 API 차단 |
| Reliability | 에이전트 장애 시 30초 이내 감지 및 재시작 |
| Usability | 첫 에이전트 생성까지 2분 이내 (설치 후) |

---

## 4. Architecture

### 4.1 Level: Single Package (NOT Monorepo)

```
vigil/
├── src/
│   ├── cli/          # CLI 엔트리포인트 + 명령어
│   ├── daemon/       # 백그라운드 데몬
│   ├── agent/        # 에이전트 런타임 + SDK
│   └── shared/       # DB, 타입, 설정, 유틸
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

### 4.2 Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Language | TypeScript 5.x | 에이전트 코드도 JS이므로 생태계 통일 |
| CLI | Commander.js | 성숙, 가벼움, 서브커맨드 지원 |
| TUI | Ink 5.x | React 컴포넌트 모델로 복잡한 TUI 관리 |
| AI | @anthropic-ai/sdk | Claude 코드 생성 품질 최고 |
| DB | better-sqlite3 | 단일 파일, 동기 API, WAL 모드 |
| IPC | Unix Domain Socket | 최고 성능, 로컬 전용 |
| Process | child_process.fork | Node.js 내장, IPC 채널 자동 |
| Validation | zod | 런타임 타입 검증 |
| Build | tsup | esbuild 기반 번들링 |
| Test | vitest | 빠른 테스트 러너 |

---

## 5. Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI 생성 코드가 실제 작동하지 않음 | Critical | 대상 URL fetch → HTML을 LLM 컨텍스트에 포함 |
| Self-Healing 없으면 에이전트 수명 수일 | Critical | MVP에 Self-Healing 필수 포함 |
| 웹 스크래핑 봇 차단 | High | 에이전트에 적절한 User-Agent, 요청 간격 조절 |
| LLM API 비용 | Medium | 템플릿 캐싱, claude-haiku로 간단한 수정 |
| 법적 리스크 (금융 데이터 스크래핑) | High | 공식 API만 권장, ToS 경고 표시 |

---

## 6. MVP Roadmap (3주)

### Week 1: Foundation + CLI + Daemon

```
1. [ ] 프로젝트 초기화 (package.json, tsconfig, tsup)
2. [ ] shared/ - 타입 정의, 상수, 설정 관리
3. [ ] shared/db - SQLite 스키마 + 마이그레이션
4. [ ] daemon/ - 기본 데몬 프로세스 (시작/종료/PID)
5. [ ] daemon/ - Unix Socket JSON-RPC 서버
6. [ ] cli/ - Commander.js 기본 구조
7. [ ] cli/ - IPC 클라이언트 (daemon 통신)
8. [ ] cli/commands - daemon start/stop/status
9. [ ] cli/commands - list, status
```

### Week 2: Factory + Runner + Sentinel

```
10. [ ] agent/runtime - 에이전트 런타임 래퍼
11. [ ] agent/sdk - vigil.fetch, vigil.notify, vigil.store, vigil.log
12. [ ] daemon/code-generator - Claude API 에이전트 생성
13. [ ] daemon/code-validator - AST 정적 분석
14. [ ] daemon/agent-manager - 에이전트 CRUD + fork 실행
15. [ ] cli/commands - watch (에이전트 생성)
16. [ ] cli/commands - start, stop, restart, destroy
17. [ ] cli/commands - logs (--follow 포함)
18. [ ] daemon/health-monitor - Heartbeat + 자동 재시작
19. [ ] daemon/self-healer - 에러 → AI 수정 → 재실행
20. [ ] daemon/notifier - Webhook 알림
```

### Week 3: TUI + Polish + Test

```
21. [ ] cli/ui/Dashboard - Ink TUI 대시보드
22. [ ] cli/commands - dash (대시보드 진입)
23. [ ] cli/commands - config set/get
24. [ ] 시스템 알림 (macOS notification)
25. [ ] 에이전트 템플릿 (web-monitor, api-check, rss-watcher)
26. [ ] E2E 테스트 (에이전트 생성 → 실행 → 알림)
27. [ ] README.md + 설치 가이드
28. [ ] npm publish 준비
```

---

## 7. Success Criteria

- [ ] `vigil watch "..."` 로 에이전트가 생성되고 백그라운드에서 실행됨
- [ ] 터미널을 닫아도 에이전트가 계속 동작함
- [ ] `vigil list` 로 실행 중인 에이전트 확인 가능
- [ ] 에이전트 오류 시 Self-Healing으로 자동 복구 (최소 1회)
- [ ] 조건 충족 시 Webhook 알림 발송
- [ ] `vigil dash` 로 TUI 대시보드 확인 가능

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-27 | Initial draft (Web 기반) | Paul |
| 0.2 | 2026-02-27 | CLI-first 전면 재작성 (4-agent brainstorming 반영) | Paul |
