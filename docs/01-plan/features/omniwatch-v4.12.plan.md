# OmniWatch v4.12.0 Plan — Tenants/Users Response Wrapping

## Overview
GET /tenants와 GET /users 엔드포인트의 응답을 일관된 래퍼 형식으로 표준화한다.
v4.11에서 표준화한 다른 리스트 엔드포인트와 동일한 패턴 적용.

## Background
- v4.11에서 queue/analytics/mesh/security 10개 엔드포인트를 래핑 완료
- tenants/users GET 리스트 엔드포인트는 아직 bare array 반환
- 모든 리스트 엔드포인트가 `{ resourceName }` 형식을 사용해야 API 계약 일관성 달성

## Goals
1. **GET /tenants 래핑**: `tenants[]` → `{ tenants: [...] }`
2. **GET /users 래핑**: `users[]` → `{ users: [...] }`
3. **테스트 기대값 수정**: 관련 테스트의 응답 형식 업데이트

## Tasks

### Task 1: Tenants Route
- GET /tenants 핸들러에서 `c.json(tenants)` → `c.json({ tenants })` 변경

### Task 2: Users Route
- GET /users 핸들러에서 `c.json(users)` → `c.json({ users })` 변경

### Task 3: Test Updates
- tenants 목록 조회 테스트: `body[0].name` → `body.tenants[0].name` 등
- users 목록 조회 테스트: 동일 패턴 수정

## Success Criteria
- [ ] GET /tenants가 `{ tenants }` 형식 반환
- [ ] GET /users가 `{ users }` 형식 반환
- [ ] 모든 테스트 통과 (526)
