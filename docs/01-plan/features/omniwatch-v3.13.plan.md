# OmniWatch v3.13.0 Plan — Agent Detail Page Tests + Notifications Zod Validation

## Overview
에이전트 상세 페이지의 렌더링 테스트 11개를 추가하고,
Notifications API 라우트에 Zod 검증을 적용하며,
SELECT * 쿼리를 명시적 컬럼으로 교체한다.

## Background
- 에이전트 상세 페이지(`/agents/[id]`)는 가장 복잡한 UI이나 테스트가 없음
- React 19의 `use()` hook이 Promise 파라미터를 사용하여 기존 테스트 패턴으로 처리 불가
- Notifications 라우트에 입력값 검증이 없어 잘못된 severity/limit 값이 통과됨
- Notifications 쿼리가 `SELECT n.*`로 불필요한 필드를 반환

## Goals
1. **에이전트 상세 테스트 11개 추가**: name, status, type, action buttons, prompt, metrics cards, 5 tabs, logs, log filters, snapshot/children badges
2. **React 19 use() 호환 테스트 패턴**: Suspense + act()로 Promise 파라미터 처리
3. **jsdom scrollIntoView mock**: jsdom에 없는 scrollIntoView 함수 모킹
4. **Notifications Zod 검증**: severity enum, limit 범위 바운드 적용
5. **명시적 컬럼 선택**: `SELECT n.*` → 명시적 컬럼 리스트

## Tasks

### Task 1: 에이전트 상세 페이지 테스트 (11개)
- 기본 정보 렌더링: name, status badge, type
- 액션 버튼: start/stop/restart/destroy
- 프롬프트 섹션 렌더링
- 메트릭 카드 (CPU, Memory 등)
- 5개 탭 (Logs, Metrics, Snapshots, Children, Config)
- 로그 목록 및 필터 UI
- Snapshot/Children 배지 카운트

### Task 2: React 19 use() hook 테스트 패턴
- React Suspense boundary로 컴포넌트 래핑
- `act()` 내에서 Promise 해결 대기
- scrollIntoView mock 추가 (jsdom 미지원)

### Task 3: Notifications Zod Validation
- severity 파라미터: `z.enum(['info', 'warning', 'error', 'critical']).optional()`
- limit 파라미터: `z.coerce.number().int().min(1).max(100).default(50)`
- 잘못된 입력 시 400 Bad Request 응답

### Task 4: Notifications 쿼리 최적화
- `SELECT n.*` → 명시적 컬럼 (id, agent_id, type, severity, message, created_at 등)

## Success Criteria
- [ ] 에이전트 상세 페이지 테스트 11개 통과
- [ ] React 19 use() hook이 Suspense + act()로 정상 동작
- [ ] scrollIntoView mock으로 jsdom 에러 없음
- [ ] Notifications 라우트에 Zod 검증 적용됨
- [ ] Notifications 쿼리에서 `SELECT n.*` 제거됨
- [ ] 웹 테스트: 110 → 121개
- [ ] 전체 테스트: 488개 통과
