# OmniWatch v3.5.0 Plan — API Hardening & Performance

## Overview
API 에러 처리 갭 해결, N+1 쿼리 최적화, 일괄 엔드포인트 테스트 추가로
안정성과 성능을 강화한다.

## Background
- 큐 라우트의 try-catch 미작성 (400 에러 처리 부재)
- health-monitor의 좀비 에이전트 조회 쿼리 반복 (SELECT * agent_logs × N)
- 일괄 에이전트 API에 대한 통합 테스트 미작성

## Goals
1. **Queue Route Hardening**: try-catch 추가, 400 에러 응답, ID 검증
2. **N+1 Query Elimination**: health-monitor batch 조회로 zombie query 최적화
3. **Bulk API Tests**: POST /api/agents/bulk 통합 테스트 (7개 시나리오)
4. **Error Handling**: 500 에러 처리, 타임아웃 응답, 부분 실패 시나리오

## Technical Approach

### Queue Route Hardening
- `apps/api/src/routes/queue.ts`에 try-catch 추가
- ID 유효성 검증 (UUID format)
- 400, 500 에러 응답 처리

### Health Monitor Optimization
- `apps/daemon/src/health-monitor.ts`에서 zombie 쿼리 배치화
- SELECT * agent_logs WHERE agent_id IN (...) N개 한 번에 조회
- 1초마다 반복 → 배치당 1회로 최적화

### Bulk API Test Cases
- valid agents bulk start/stop
- invalid agent IDs 처리
- max 50 제한 초과
- mixed success/failure 응답
- permission denied (viewer role)
- timeout 시나리오
- partial retry on failure

## Scope
- ✅ Queue 라우트 try-catch 추가
- ✅ ID 유효성 검증 추가
- ✅ Health-monitor 배치 쿼리 최적화
- ✅ 7개 통합 테스트 케이스 작성

## Risk
- 배치 쿼리 변경 시 데이터 정합성 검증 필요
- 타임아웃 시뮬레이션 테스트의 안정성 이슈
