# OmniWatch v3.4.0 Plan — Dashboard Test Coverage

## Overview
대시보드의 7개 미테스트 페이지에 대한 단위/통합 테스트를 추가하여
웹 레이어의 신뢰성과 유지보수성을 강화한다.

## Background
- 웹 테스트: 61개 (전체 415개 중 14.7%)
- 대시보드 페이지 14개 중 7개가 테스트 미작성
- agents, analytics, marketplace, mesh, notifications, queue, tenants 페이지 미완료
- 리팩토링/버그 수정 시 회귀 테스트 부재

## Goals
1. **agents 페이지 테스트**: 목록 렌더링, 필터/검색, 빈 상태 처리
2. **analytics 페이지 테스트**: 차트 렌더링, 날짜 범위 선택, 이상 탐지 표시
3. **marketplace 페이지 테스트**: 검색, 필터, 설치 확인 모달
4. **mesh 페이지 테스트**: 토폴로지 렌더링, 이벤트 필터, 연결 상태
5. **notifications 페이지 테스트**: 목록 렌더링, 읽음 표시, 삭제
6. **queue 페이지 테스트**: 미완료/일괄 재시도, 데드레터, 상태 필터
7. **tenants 페이지 테스트**: 목록, 편집 모달, API 키 로테이션

## Technical Approach

### Test Files Structure
- `apps/web/src/__tests__/pages/agents.test.tsx`
- `apps/web/src/__tests__/pages/analytics.test.tsx`
- `apps/web/src/__tests__/pages/marketplace.test.tsx`
- `apps/web/src/__tests__/pages/mesh.test.tsx`
- `apps/web/src/__tests__/pages/notifications.test.tsx`
- `apps/web/src/__tests__/pages/queue.test.tsx`
- `apps/web/src/__tests__/pages/tenants.test.tsx`

### Test Scope per Page
- 컴포넌트 렌더링 (smoke test)
- 주요 상호작용 (필터, 검색, 모달)
- API 호출 모킹 및 응답 검증
- 에러 상태 및 빈 상태 처리
- 최소 4-6개 케이스 per 페이지

## Scope
- ✅ 7개 페이지 테스트 파일 생성
- ✅ 총 33개 테스트 케이스 작성 (per page 4-6개)
- ✅ API fetch 모킹 및 상태 검증
- ✅ 에러/빈 상태 테스트 포함

## Risk
- 페이지별 복잡도 편차 (analytics > mesh > queue)
- API 응답 스키마 변경 시 모킹 업데이트 필요
- 웹팩 설정에 따른 import 경로 모킹 이슈
