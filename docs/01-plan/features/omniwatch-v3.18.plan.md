# OmniWatch v3.18.0 Plan — API Test Coverage Expansion

## Overview
API 테스트 커버리지를 확대하여
미검증 엔드포인트의 통합 테스트를 확보한다.

## Background
- recipes, usage, tenants, marketplace detail, auth login 엔드포인트에 통합 테스트 부재
- v3.14에서 mesh, snapshots, children 테스트 8개 추가 (367 → 375)
- 추가 15개 테스트로 주요 API 엔드포인트 커버리지 완성

## Goals
1. **Recipes 테스트**: GET list, search, category, 404 (4개)
2. **Usage 테스트**: GET 성공, days 파라미터, 검증 실패 (4개)
3. **Tenants 테스트**: GET list, POST 생성, POST 검증 실패 (3개)
4. **Marketplace 테스트**: GET detail 200, GET detail 404 (2개)
5. **Auth 테스트**: POST /auth/login 검증 실패, 401 (2개)

## Tasks

### Task 1: Recipes API Tests (4개)
- GET /recipes — 목록 조회 200 응답 확인
- GET /recipes?q=search — 검색 파라미터 동작 확인
- GET /recipes?category=test — 카테고리 필터 동작 확인
- GET /recipes/:id — 존재하지 않는 레시피 404 확인

### Task 2: Usage API Tests (4개)
- GET /usage — 기본 조회 200 응답 확인
- GET /usage?days=7 — days 파라미터 동작 확인
- GET /usage?days=0 — 최소값 미만 검증 실패 400 확인
- GET /usage?days=999 — 최대값 초과 검증 실패 400 확인

### Task 3: Tenants API Tests (3개)
- GET /tenants — 목록 조회 200 응답 확인
- POST /tenants — 정상 생성 201 응답 확인
- POST /tenants — 필수 필드 누락 검증 실패 400 확인

### Task 4: Marketplace API Tests (2개)
- GET /marketplace/:id — 존재하는 레시피 200 응답 확인
- GET /marketplace/:id — 존재하지 않는 레시피 404 응답 확인

### Task 5: Auth API Tests (2개)
- POST /auth/login — 필수 필드 누락 검증 실패 400 확인
- POST /auth/login — 잘못된 자격 증명 401 응답 확인

## Success Criteria
- [ ] Recipes 테스트 4개 추가 및 통과
- [ ] Usage 테스트 4개 추가 및 통과
- [ ] Tenants 테스트 3개 추가 및 통과
- [ ] Marketplace 테스트 2개 추가 및 통과
- [ ] Auth 테스트 2개 추가 및 통과
- [ ] Root 테스트: 375 → 390 (+15)
- [ ] Total 테스트: 511 (390 root + 121 web)
