# OmniWatch v3.15.0 Plan — Type Safety Cleanup

## Overview
프로덕션 코드의 `any` 타입 사용을 제거하고,
타입 안전한 인터페이스로 교체하며,
런타임 타입 에러를 수정한다.

## Background
- metricsHistory가 `any[]`로 선언되어 타입 안전성 부재
- Analytics CustomTooltip의 payload가 타입 미정의
- Notification badge가 존재하지 않는 `read` 필드로 필터링하여 항상 0 표시
- Date 생성자에 `string | undefined`가 전달되어 잠재적 Invalid Date 발생

## Goals
1. **MetricHistoryEntry 인터페이스**: `any[]` metricsHistory를 타입화
2. **TooltipPayloadEntry 타입**: Analytics CustomTooltip payload 타입 정의
3. **Notification badge 수정**: 존재하지 않는 read 필드 필터 제거, total count 사용
4. **Date 생성자 타입 수정**: `string | undefined` → `Date.now()` 폴백

## Tasks

### Task 1: MetricHistoryEntry Interface
- metricsHistory의 각 항목 타입 정의 (timestamp, cpu, memory 등)
- `any[]` → `MetricHistoryEntry[]`로 교체
- 관련 컴포넌트에서 타입 전파

### Task 2: TooltipPayloadEntry Type
- recharts CustomTooltip의 payload entry 타입 정의
- name, value, color 등 필드 타이핑
- Analytics 페이지의 CustomTooltip 컴포넌트에 적용

### Task 3: Notification Badge Fix
- 현재: `notifications.filter(n => !n.read)` — read 필드 없음
- 수정: 전체 알림 count 사용 (`notifications.length` 또는 total)
- 배지가 실제 미확인 알림 수를 정확히 표시

### Task 4: Date Constructor Type Safety
- `new Date(value)` where value: `string | undefined`
- undefined 시 `Date.now()` 폴백 적용
- Invalid Date 런타임 에러 방지

## Success Criteria
- [ ] metricsHistory에 `any[]` 제거, MetricHistoryEntry 적용
- [ ] CustomTooltip에 TooltipPayloadEntry 타입 적용
- [ ] Notification badge가 정확한 count 표시
- [ ] Date 생성자에 undefined 전달 불가
- [ ] TypeScript 컴파일 에러 0건
- [ ] 전체 테스트: 496개 통과 (375 root + 121 web)
