# OmniWatch v4.11.0 Plan — API Response Format Standardization

## Overview
모든 리스트/쿼리 엔드포인트의 응답을 일관된 `{ resourceName }` 래퍼 형식으로 표준화한다.
queue, analytics, mesh, security 라우트에서 bare array/object를 반환하는 10개 엔드포인트를 수정.

## Background
- v4.8에서 POST 201 응답 래퍼를 표준화했으나, GET 리스트 엔드포인트는 여전히 불일치
- queue 라우트: stats, dead-letters, retry-all이 bare 응답 반환
- analytics 라우트: metrics, anomalies, alerts 관련 5개가 bare 응답
- mesh/security 라우트: 각 1개씩 bare 응답
- 테스트 mock이 실제 핸들러 반환 타입과 불일치하는 경우 존재

## Goals
1. **Queue 라우트 래핑** (3개): stats → `{ stats }`, dead-letters → `{ deadLetters }`, retry-all → `{ retried }`
2. **Analytics 라우트 래핑** (5개): metrics/anomalies/alerts 관련 엔드포인트
3. **Mesh 라우트 래핑** (1개): mesh events → `{ events }`
4. **Security 라우트 래핑** (1개): security events → `{ events }`
5. **테스트 mock 업데이트**: 래핑된 응답 형식에 맞게 테스트 기대값 수정

## Tasks

### Task 1: Queue Routes (3 endpoints)
- GET /queue/stats → `c.json({ stats })` 래퍼
- GET /queue/dead-letters → `c.json({ deadLetters })` 래퍼
- POST /queue/retry-all → `c.json({ retried })` 래퍼

### Task 2: Analytics Routes (5 endpoints)
- GET /analytics/metrics → `c.json({ metrics })` 래퍼
- GET /analytics/anomalies → `c.json({ anomalies })` 래퍼
- GET /analytics/alerts → `c.json({ alerts })` 래퍼
- PUT /analytics/alerts/:id → `c.json({ rule })` 래퍼 (이미 래핑된 경우 확인)
- DELETE /analytics/alerts/:id → 204 유지 (래핑 불필요)

### Task 3: Mesh Route (1 endpoint)
- GET /mesh/events → `c.json({ events })` 래퍼

### Task 4: Security Route (1 endpoint)
- GET /security/events → `c.json({ events })` 래퍼

### Task 5: Test Mock Updates
- 모든 관련 테스트의 기대값을 래핑된 형식으로 수정
- 총 10개 엔드포인트에 대한 테스트 검증

## Success Criteria
- [ ] 10개 리스트 엔드포인트가 일관된 `{ resourceName }` 형식 반환
- [ ] 모든 테스트 통과 (405 root + 121 web = 526)
- [ ] 기존 프론트엔드 호환성 유지 (defensive code로 커버)
