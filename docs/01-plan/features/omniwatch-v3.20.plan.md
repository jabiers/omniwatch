# OmniWatch v3.20.0 Plan — SELECT * Complete Elimination

## Overview
프로덕션 코드에서 남은 마지막 3개의 SELECT * 쿼리를 제거하여
데이터베이스 선택의 안전성과 명확성을 완성한다.

## Background
- v3.19에서 5개 데몬 모듈의 SELECT * 제거
- handlers/log.ts에 2개, ws.ts에 1개 SELECT * 쿼리 남아있음
- 이 3개를 제거하면 프로덕션 코드 SELECT * 완전 제거 완료

## Goals
프로덕션 코드에서 SELECT * 쿼리 완전 제거 (마지막 3개)

## Tasks

### Task 1: handlers/log.ts (2개 쿼리)
- getAgentLogs() 쿼리 1: SELECT * → SELECT id, agent_id, level, message, metadata, created_at, updated_at
- getAgentLogs() 쿼리 2 (필터 변형): SELECT * → 동일 컬럼 명시

### Task 2: ws.ts pollLogs (1개 쿼리)
- pollLogs() 쿼리: SELECT * → SELECT id, agent_id, level, message, metadata, created_at

## Success Criteria
- [ ] handlers/log.ts 2개 쿼리 변환 완료
- [ ] ws.ts 1개 쿼리 변환 완료
- [ ] grep "SELECT \*" 확인: apps/ 디렉토리에서 0건
- [ ] Root 테스트: 390 통과 ✅
- [ ] Build: 6/6 packages ✅
- [ ] TypeScript: 0 errors ✅
