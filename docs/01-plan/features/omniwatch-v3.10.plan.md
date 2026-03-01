# OmniWatch v3.10.0 Plan — README Sync & Error Response Standardization

## Overview
README를 최신 상태로 동기화하고, API 에러 응답 형식을 표준화한다.
테스트 수(477), 엔드포인트 수(70+), Quality & Security 섹션을 추가하고,
공통 에러 응답 타입과 헬퍼 함수를 도입한다.

## Background
- README의 테스트 수, 엔드포인트 수가 실제와 불일치 (outdated)
- v3.0-v3.9에서 추가된 품질/보안 개선사항이 README에 미반영
- API 에러 응답 형식이 라우트별로 일관되지 않음 (error/message/detail 혼용)
- OAuth 에러에서 `detail` 필드가 다른 API의 `details` 와 불일치

## Goals
1. **README 업데이트**: 테스트 수(477), 엔드포인트 수(70+), Quality & Security 섹션 추가
2. **ApiErrorResponse 타입**: 표준 에러 응답 타입을 shared 패키지에 정의
3. **apiError() 헬퍼**: 일관된 에러 응답 생성 유틸리티 함수
4. **OAuth 에러 필드 정규화**: `detail` → `details` 통일

## Tasks

### Task 1: README 동기화
- 테스트 수를 477로 업데이트
- 엔드포인트 수를 70+로 업데이트
- Quality & Security (v3.0-v3.9) 섹션 추가

### Task 2: ApiErrorResponse 타입 + apiError() 헬퍼
- `packages/shared/src/utils.ts`에 ApiErrorResponse 타입 정의
- apiError() 헬퍼 함수 작성 (status, error, details 반환)
- 기존 인라인 에러 응답을 대체할 수 있는 표준 인터페이스

### Task 3: OAuth 에러 필드 정규화
- OAuth 라우트의 `detail` 필드를 `details`로 변경
- 전체 API에서 에러 필드명 일관성 확보

## Success Criteria
- [ ] README에 테스트 수 477, 엔드포인트 수 70+ 반영
- [ ] Quality & Security 섹션이 README에 존재
- [ ] ApiErrorResponse 타입이 shared 패키지에 정의됨
- [ ] apiError() 헬퍼 함수가 동작함
- [ ] OAuth 에러 `detail` → `details` 통일
- [ ] 빌드 6/6 + 테스트 477 통과
