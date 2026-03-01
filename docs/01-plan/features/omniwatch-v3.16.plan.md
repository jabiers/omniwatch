# OmniWatch v3.16.0 Plan — Zod Validation Completion

## Overview
나머지 미검증 API 라우트에 Zod 검증을 적용하여
전체 API 입력 검증을 zValidator로 통일한다.

## Background
- recipes 라우트의 query/category 파라미터가 수동 검증 또는 미검증
- usage 라우트의 days 파라미터가 수동 parseInt 검증
- OAuth callback 라우트의 code/state 파라미터가 미검증
- v3.13-v3.14에서 notifications, mesh, snapshots Zod 적용 완료

## Goals
1. **recipes.ts에 listRecipesSchema 추가**: q max 200, category max 50 검증
2. **usage.ts에 usageQuerySchema 추가**: 수동 검증 제거, zValidator 통일
3. **oauth.ts에 oauthCallbackSchema 추가**: GitHub/Google 콜백 파라미터 검증

## Tasks

### Task 1: Recipes Zod Validation
- listRecipesSchema 정의 (q: string max 200 optional, category: string max 50 optional)
- GET /recipes 라우트에 zValidator('query', listRecipesSchema) 적용
- 기존 수동 파라미터 접근을 validated data로 교체

### Task 2: Usage Zod Validation
- usageQuerySchema 정의 (days: coerce number min 1 max 365 default 30)
- GET /usage 라우트에 zValidator('query', usageQuerySchema) 적용
- 기존 수동 parseInt 검증 코드 제거

### Task 3: OAuth Callback Zod Validation
- oauthCallbackSchema 정의 (code: string min 1, state: string optional)
- GitHub/Google 콜백 라우트에 zValidator('query', oauthCallbackSchema) 적용
- 누락된 code 파라미터에 대한 명확한 400 에러 응답

## Success Criteria
- [ ] recipes.ts에 listRecipesSchema 적용, 수동 검증 제거
- [ ] usage.ts에 usageQuerySchema 적용, parseInt 제거
- [ ] oauth.ts에 oauthCallbackSchema 적용
- [ ] 모든 API 입력 검증이 zValidator로 통일
- [ ] 전체 테스트: 496개 통과 (375 root + 121 web)
