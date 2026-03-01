# OmniWatch v4.5.0 Plan — SQL Parameterization + DELETE Tests

## Overview
SQL 인젝션 취약점을 수정하고 DELETE 엔드포인트에 대한 테스트 커버리지를 추가한다.

## Background
- `apps/api/src/routes/usage.ts`에서 `days` 파라미터가 템플릿 리터럴로 SQL에 직접 삽입되고 있음
- v4.4에서 DELETE 204로 변경했지만 관련 테스트가 부족

## Goals
1. **SQL 파라미터화**: usage.ts의 템플릿 리터럴 SQL을 파라미터 바인딩으로 변환
2. **DELETE 테스트 추가**: 7개 DELETE 엔드포인트 테스트 신규 작성

## Tasks

### Task 1: SQL Parameterization — usage.ts
- 템플릿 리터럴 `'-${days} days'` → `dateModifier` 변수 + `?` 파라미터 바인딩
- 4개 쿼리 모두 수정: `datetime('now', ?)` + `.get(dateModifier, ...params)`

### Task 2: DELETE Tests — agents
- DELETE /agents/:id 성공(204) + 엔진 에러(502) 2개 테스트

### Task 3: DELETE Tests — analytics
- DELETE /analytics/alerts/:id 성공(204) 1개 테스트

### Task 4: DELETE Tests — marketplace
- DELETE /marketplace/:id 성공(204) + 404 2개 테스트

### Task 5: DELETE Tests — users
- DELETE /users/:id 성공(204) + 404 2개 테스트

## Success Criteria
- [ ] usage.ts에 템플릿 리터럴 SQL 0건
- [ ] 7개 DELETE 테스트 추가
- [ ] 전체 테스트 397+ 통과
