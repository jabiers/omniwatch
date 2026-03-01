# OmniWatch v4.4.0 Plan — DELETE 204 + Dockerfile + PDCA Cleanup

## Overview
REST 규약 준수를 위해 DELETE 엔드포인트를 204 No Content로 표준화하고,
Dockerfile에서 제거된 daemon 패키지의 잔여 COPY 라인을 정리하며,
PDCA 상태 파일의 스테일 엔트리를 클린업한다.

## Background
- DELETE 엔드포인트 4개가 200 + JSON body를 반환하고 있어 REST 규약에 맞지 않음
- v4.0에서 daemon 패키지를 제거했으나 Dockerfile의 api 타겟에 daemon COPY 라인 잔존
- `.pdca-status.json`에 8개 스테일 엔트리가 남아 있음

## Goals
1. **DELETE 204 표준화**: 4개 DELETE 엔드포인트를 200 → 204 No Content로 변경
2. **Dockerfile 정리**: 제거된 daemon 패키지의 COPY 라인 삭제
3. **PDCA 클린업**: 스테일 엔트리 제거, v4.0-v4.3 기록 추가
4. **테스트 업데이트**: DELETE 응답 코드 변경에 맞게 기존 테스트 수정

## Tasks

### Task 1: DELETE 204 — agents
- `apps/api/src/routes/agents.ts` DELETE /agents/:id → `c.body(null, 204)`

### Task 2: DELETE 204 — analytics
- `apps/api/src/routes/analytics.ts` DELETE /analytics/alerts/:id → `c.body(null, 204)`

### Task 3: DELETE 204 — marketplace
- `apps/api/src/routes/marketplace.ts` DELETE /marketplace/:id → `c.body(null, 204)`

### Task 4: DELETE 204 — tenants/users
- `apps/api/src/routes/tenants.ts` DELETE /users/:id → `c.body(null, 204)`

### Task 5: Dockerfile 정리
- `Dockerfile` api 타겟에서 daemon COPY 라인 2줄 제거

### Task 6: PDCA 상태 클린업
- `.pdca-status.json`에서 스테일 8개 엔트리 제거
- v4.0-v4.3 완료 기록 추가

### Task 7: 테스트 수정
- `tests/auth-middleware.test.ts` marketplace DELETE 테스트 기대값 200 → 204

## Success Criteria
- [ ] 4개 DELETE 엔드포인트 모두 204 반환
- [ ] Dockerfile에 daemon 참조 없음
- [ ] PDCA 상태 파일 최신화
- [ ] 기존 테스트 통과 (390+ tests)
