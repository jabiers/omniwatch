# OmniWatch v0.3 Plan - Production Hardening

## 1. Overview

**Feature Name**: omniwatch-v0.3
**Version**: 0.3.0
**Goal**: Definition.md의 미구현 요구사항을 완성하고 프로덕션 수준의 안정성을 확보한다.
**Priority**: High
**Estimated Scope**: 15 files 신규/수정, ~1,500 LOC

## 2. Background & Motivation

v0.2까지 기본 아키텍처(CLI→Daemon→Agent)와 핵심 기능(watch, TUI, chat, notifications)이 구현되었다.
그러나 Definition.md에서 명시한 여러 요구사항이 미구현 또는 불완전 상태:

- Agent Types: `omni do`, `omni auto` 미구현 (Definition §4)
- Resource Enforcement: MAX_AGENTS/memory limit 미적용 (Definition §3.B.4)
- Code Validator: 무한루프/복잡도 탐지 부재 (Definition §3.A.2)
- Self-Healing: AI 기반 근본 원인 분석 부재 (Definition §3.C.1)
- Smart Throttle: 심각도별 알림 빈도 조절 부재 (Definition §3.C.4)
- SDK: retry, sleep, timeout 등 유틸리티 부재

## 3. Feature Requirements

### FR-01: Agent Type - Doer (`omni do`)
- `omni do "<prompt>"` 명령으로 주기적/단발 작업 에이전트 생성
- `--once` 플래그: 1회 실행 후 자동 종료
- `--schedule "<cron>"` 플래그: cron 표현식 기반 반복 실행
- 코드 생성 시 Doer 전용 시스템 프롬프트 사용

### FR-02: Agent Type - Auto (`omni auto`)
- `omni auto "<prompt>"` 명령으로 자율 판단 에이전트 생성
- 자체 판단으로 알림/작업 실행
- 에이전트 간 독립적 의사결정 루프
- 코드 생성 시 Auto 전용 시스템 프롬프트 사용

### FR-03: Resource Enforcement
- 에이전트 생성 시 `MAX_AGENTS` (20) 초과 검증
- 초과 시 에러 반환 + 기존 에이전트 목록 표시
- running 에이전트 수 기준 카운트
- 메모리 제한 적용 확인 (child_process execArgv)

### FR-04: Code Validator Enhancement
- 무한루프 패턴 탐지: `while(true)`, `for(;;)` 등 탈출 조건 없는 루프
- `setTimeout`/`setInterval` 가드 없는 재귀 호출 탐지
- 과도한 중첩 깊이 경고 (depth > 10)
- 금지 API 우회 탐지: `globalThis['eval']`, `Reflect.apply`

### FR-05: Self-Healing Enhancement
- 에러 발생 시 최근 로그 + 에러 스택 + 에이전트 코드를 AI에 전달
- AI가 근본 원인 분석 후 수정 코드 생성
- 치유 시도 간 지수 백오프 (1m → 5m → 15m)
- 동일 에러 반복 시 자동 중단 + 사용자 알림

### FR-06: Smart Throttle
- 심각도별 알림 빈도 제어:
  - critical: 즉시 전송
  - warning: 5분 내 중복 억제
  - info: 15분 내 중복 억제
- 에이전트별 throttle 상태 관리
- 억제된 알림 수 카운터

### FR-07: SDK Expansion
- `omni.sleep(ms)`: Promise 기반 대기
- `omni.retry(fn, opts)`: 재시도 래퍼 (maxRetries, delay, backoff)
- `omni.timeout(fn, ms)`: 타임아웃 래퍼

### FR-08: Database Improvements
- `agents` 테이블 인덱스: `status`, `created_at`
- `notifications` 테이블 인덱스: `created_at`, `severity`
- `agent_metrics` 테이블 추가: run_count, success_count, avg_duration, last_duration

### FR-09: Agent Count Enforcement in CLI
- `omni list` 에 running/total 카운트 표시
- `omni status` 에 리소스 사용 현황 표시

### FR-10: Integration Tests
- Daemon 시작/종료 E2E 테스트
- Agent 생성→실행→중지 플로우 테스트
- Notification throttle 동작 테스트
- Resource limit 초과 테스트

## 4. Out of Scope (v0.4+)

- Web Dashboard (Next.js)
- Agent-to-Agent event bus
- Docker containerization
- PostgreSQL migration
- Plugin marketplace
- TOML config migration

## 5. Technical Approach

### 5.1 New Files
- `src/cli/commands/do.ts` - Doer command
- `src/cli/commands/auto.ts` - Auto command
- `src/daemon/smart-throttle.ts` - Throttle engine
- `src/agent/templates/doer.ts` - Doer template
- `src/agent/templates/auto.ts` - Auto template
- `tests/do-command.test.ts`
- `tests/auto-command.test.ts`
- `tests/smart-throttle.test.ts`
- `tests/resource-enforcement.test.ts`
- `tests/integration/agent-lifecycle.test.ts`

### 5.2 Modified Files
- `src/cli/index.ts` - Register do/auto commands
- `src/daemon/agent-manager.ts` - Resource enforcement
- `src/daemon/code-validator.ts` - Loop/recursion detection
- `src/daemon/self-healer.ts` - AI context enhancement
- `src/daemon/notifier.ts` - Throttle integration
- `src/agent/sdk.ts` - sleep/retry/timeout methods
- `src/shared/db.ts` - Indices + metrics table
- `src/shared/types.ts` - New types
- `package.json` - Version bump to 0.3.0

### 5.3 Implementation Order
1. Types & DB schema updates (foundation)
2. SDK expansion (agent-level)
3. Code validator enhancement (security)
4. Resource enforcement (daemon-level)
5. Doer command + template (feature)
6. Auto command + template (feature)
7. Smart throttle (notification)
8. Self-healing enhancement (reliability)
9. CLI output improvements
10. Tests

## 6. Success Criteria

- [ ] `omni do` / `omni auto` 정상 동작
- [ ] MAX_AGENTS 초과 시 에러 반환
- [ ] 무한루프 코드 검증 시 탐지
- [ ] Self-healing 시 AI 컨텍스트 포함
- [ ] Smart throttle로 info 알림 15분 억제
- [ ] 모든 기존 테스트 통과 + 신규 테스트 추가
- [ ] Gap analysis match rate >= 90%

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI 컨텍스트 전달 시 토큰 한도 초과 | Self-healing 실패 | 최근 20줄 로그로 제한 |
| 무한루프 탐지 오탐 | 정상 코드 거부 | while + break 패턴 허용 |
| Smart throttle 메모리 | 메모리 증가 | TTL 기반 자동 정리 |
