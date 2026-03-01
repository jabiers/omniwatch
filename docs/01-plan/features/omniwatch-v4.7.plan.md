# OmniWatch v4.7.0 Plan — Tenant Isolation + Numeric ID Validation

## Overview
에이전트 하위 라우트(logs, metrics)의 테넌트 격리 누락을 수정하고,
analytics/queue 라우트의 숫자 ID 파라미터에 Zod 검증을 추가한다.

## Background
- agents/:id/logs와 agents/:id/metrics가 tenant_id 검증 없이 데이터를 반환
- analytics alerts PUT/DELETE에서 `:id`를 Number()로만 변환, NaN 방어 없음
- queue dead-letter retry에서 수동 isNaN 검증 → Zod로 통일 필요

## Goals
1. **테넌트 격리**: agents/:id/logs, agents/:id/metrics에 tenant_id 검증 추가
2. **Zod ID 검증**: analytics alerts PUT/DELETE에 numericIdParam 스키마 적용
3. **Zod ID 검증**: queue dead-letters/:id/retry에 numericIdParam 스키마 적용
4. **테스트**: 테넌트 격리 4개 + 숫자 ID 검증 4개 = 8개 테스트 추가

## Tasks

### Task 1: agents/:id/logs 테넌트 격리
- SELECT id → SELECT id, tenant_id로 확장
- auth.role !== 'admin' && agent.tenant_id !== auth.tenantId → 404

### Task 2: agents/:id/metrics 테넌트 격리
- 동일 패턴 적용

### Task 3: analytics alerts Zod param
- numericIdParam 스키마 정의 (z.coerce.number().int().min(1))
- PUT/DELETE에 zValidator('param', numericIdParam) 적용

### Task 4: queue dead-letter Zod param
- 수동 isNaN 검증 → zValidator('param', numericIdParam) 교체

### Task 5: 테스트 8개 추가
- 테넌트 격리: logs/metrics × (다른 테넌트 404 + 자기 테넌트 200)
- 숫자 ID: analytics PUT/DELETE + queue retry × 비숫자/음수

## Success Criteria
- [ ] agents/:id/logs, metrics에서 타 테넌트 데이터 접근 불가
- [ ] 비숫자/음수 ID에 400 반환
- [ ] 테스트 397 → 405 (+8)
