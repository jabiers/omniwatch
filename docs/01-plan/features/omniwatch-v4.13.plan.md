# OmniWatch v4.13.0 Plan — Dashboard Defensive Code Cleanup

## Overview
v4.11-v4.12에서 API 응답 형식이 표준화되었으므로, 프론트엔드에서
`Array.isArray(data) ? data : data.xxx` 패턴의 방어 코드를 제거한다.
8개 페이지 컴포넌트와 4개 테스트 파일에서 약 30줄의 불필요한 코드 정리.

## Background
- API 응답이 bare array/래핑 객체 중 어느 것이 올지 불확실했기 때문에 방어 코드 존재
- v4.11-v4.12에서 모든 리스트 엔드포인트를 `{ resourceName }` 형식으로 통일
- 이제 프론트엔드는 항상 래핑된 응답만 기대하면 됨
- 방어 코드 제거로 가독성/유지보수성 향상

## Goals
1. **페이지 컴포넌트 정리** (8개): 방어 코드 → 직접 접근으로 변경
2. **테스트 파일 정리** (4개): 방어 코드와 관련된 mock/assertion 단순화
3. **코드 약 30줄 제거**: 불필요한 조건 분기 삭제

## Tasks

### Task 1: Page Components (8 files)
- `apps/web/app/page.tsx` — dashboard 메인 페이지
- `apps/web/app/agents/page.tsx` — agents 리스트
- `apps/web/app/agents/[id]/page.tsx` — agent 상세
- `apps/web/app/analytics/page.tsx` — analytics
- `apps/web/app/notifications/page.tsx` — notifications
- `apps/web/app/queue/page.tsx` — queue
- `apps/web/app/tenants/page.tsx` — tenants
- `apps/web/app/layout.tsx` — layout (notifications count 등)

각 파일에서:
```typescript
// Before (방어 코드)
const items = Array.isArray(data) ? data : data.items;

// After (직접 접근)
const items = data.items;
```

### Task 2: Test Files (4 files)
- agent detail 테스트
- notifications 테스트
- queue 테스트
- tenants 테스트

각 파일에서 방어 코드 관련 mock/assertion 단순화.

## Success Criteria
- [ ] 8개 페이지에서 `Array.isArray` 방어 코드 제거
- [ ] 4개 테스트 파일에서 관련 코드 단순화
- [ ] 약 30줄 코드 제거
- [ ] 모든 테스트 통과 (526)
- [ ] 런타임 동작 변경 없음
