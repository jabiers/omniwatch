# OmniWatch v4.8.0 Plan — Bulk N+1 Fix + 201 Response Standardization

## Overview
벌크 에이전트 작업의 N+1 쿼리를 단일 배치 쿼리로 최적화하고,
POST 201 응답의 래퍼 형식을 일관되게 표준화한다.

## Background
- POST /agents/bulk에서 테넌트 격리 시 에이전트 수만큼 개별 SELECT 실행 (N+1)
- POST /analytics/alerts → 201에서 bare `rule` 반환 (래퍼 없음)
- POST /tenants → 201에서 bare `tenant` 반환 (래퍼 없음)
- POST /agents → 201에서 `{ agent: result }` 래퍼 사용 (일관성 없음)

## Goals
1. **N+1 최적화**: 벌크 작업 테넌트 격리를 IN 절 단일 쿼리로 교체
2. **201 표준화**: analytics alerts → `{ rule }`, tenants → `{ tenant }`
3. **테스트 업데이트**: 기존 tenant 생성 테스트의 응답 기대값 수정

## Tasks

### Task 1: Bulk N+1 → Batch Query
- for 루프 내 개별 SELECT → 전체 ID에 대한 IN 절 단일 쿼리
- allowedIds Set으로 O(1) 검증

### Task 2: analytics alerts 201 래퍼
- `c.json(rule, 201)` → `c.json({ rule }, 201)`

### Task 3: tenants 201 래퍼
- `c.json(tenant, 201)` → `c.json({ tenant }, 201)`

### Task 4: 테스트 기대값 수정
- tenant 생성 테스트: body.name → body.tenant.name

## Success Criteria
- [ ] 벌크 50개 에이전트에 쿼리 1회 (기존 50회)
- [ ] 모든 POST 201 응답이 래퍼 객체 사용
- [ ] 기존 405 테스트 전부 통과
