# OmniWatch v4.1.0 Plan — Route Error Handling Hardening

## Overview
보호되지 않은 async route handler에 try-catch를 추가하여 unhandled rejection을 제거한다.
v4.0 통합 후 analytics, config, tenants, oauth 라우트에 에러 핸들링이 누락된 핸들러가 존재.

## Background
- **현재 문제**: 17개 async handler에 try-catch 없음
  - analytics.ts: 7 handlers
  - config.ts: 1 handler
  - tenants.ts: 4 handlers
  - oauth.ts: 5 handlers
- 비정상 입력 시 500 Internal Server Error (unstructured) 반환
- getErrorMessage() 유틸이 존재하지만 미사용

## Goals
1. **17개 핸들러 try-catch 추가**: 모든 unprotected async route handler 보호
2. **구조화된 에러 응답**: `{ error: getErrorMessage(e) }` 형태로 통일
3. **기존 패턴 일관성**: agents.ts, recipes.ts 등 기존 보호된 라우트와 동일한 패턴 적용

## Tasks

### Task 1: analytics.ts (7 handlers)
- GET /analytics/metrics
- GET /analytics/anomalies
- GET /analytics/alerts
- POST /analytics/alerts
- PUT /analytics/alerts/:id
- DELETE /analytics/alerts/:id
- POST /analytics/collect

### Task 2: config.ts (1 handler)
- PUT /config

### Task 3: tenants.ts (4 handlers)
- GET /tenants
- POST /tenants
- PUT /tenants/:id
- DELETE /tenants/:id

### Task 4: oauth.ts (5 handlers)
- POST /oauth/login
- POST /oauth/logout
- GET /oauth/me
- GET /oauth/github/callback
- GET /oauth/google/callback

## Success Criteria
- [ ] 17개 핸들러 모두 try-catch 적용
- [ ] 모든 catch 블록에서 getErrorMessage() 사용
- [ ] 빌드 5/5 성공
- [ ] 테스트 511개 통과
