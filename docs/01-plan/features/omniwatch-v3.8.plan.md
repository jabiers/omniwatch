# OmniWatch v3.8.0 Plan — Dashboard & Agent-New Page Tests

## Overview
대시보드 메인 페이지와 에이전트 생성 페이지에 대한 렌더링 테스트를 추가하여
웹 테스트 커버리지를 확대한다.

## Background
- v3.4에서 7개 페이지 테스트 추가 (agents, analytics, marketplace 등)
- 핵심 페이지인 Dashboard(/)와 Agent New(/agents/new)가 미테스트 상태
- Dashboard: stat cards, quick actions, WS status 등 핵심 UI 요소
- Agent New: form 요소 (prompt, type radio, name, options, 버튼 등)
- "Create Agent" 텍스트 중복 이슈 발견 (heading + submit 버튼)

## Goals
1. **dashboard.test.tsx**: 7개 테스트 케이스
   - 헤딩 렌더링
   - Stat cards (agents, errors, uptime, notifications)
   - Quick actions 버튼
   - WebSocket 상태 표시
   - Agent 목록 렌더링
   - Notification 목록 렌더링
   - Uptime 표시
2. **agents-new.test.tsx**: 9개 테스트 케이스
   - 헤딩 렌더링
   - Prompt textarea
   - Type radio buttons (autonomous/reactive/scheduled)
   - Name input
   - Options (sandbox level, auto-heal 등)
   - Preview 버튼
   - Submit 버튼
   - Back link
3. **"Create Agent" 중복 해결**: heading vs submit 버튼 텍스트 구분

## Technical Approach

### Dashboard Test
```typescript
// apiFetch mock: agents, notifications, system status
// WebSocket store mock: connected/disconnected 상태
// 각 stat card 숫자 검증
// Quick action 버튼 존재 확인
```

### Agent New Test
```typescript
// form 요소 접근: getByRole, getByLabelText, getByPlaceholderText
// radio group 검증: autonomous, reactive, scheduled
// "Create Agent" 중복 → heading과 submit 구분 (getByRole)
```

## Scope
- ✅ dashboard.test.tsx 7개 테스트
- ✅ agents-new.test.tsx 9개 테스트
- ✅ "Create Agent" 텍스트 중복 해결
- ✅ Web tests 94 → 110 목표

## Risk
- Dashboard의 복잡한 데이터 의존성 (agents + notifications + system)
- 컴포넌트 렌더링 순서에 따른 비동기 테스트 불안정성
