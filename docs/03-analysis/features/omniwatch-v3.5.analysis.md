# OmniWatch v3.5.0 Gap Analysis

## Analysis Date: 2026-03-02
## Match Rate: 95%

## Plan vs Implementation

| Plan Item | Status | Notes |
|-----------|--------|-------|
| Queue route try-catch | ✅ Implemented | 400/500 에러 처리 추가 |
| ID 유효성 검증 | ✅ Implemented | UUID format 검증 |
| Health-monitor batch query | ✅ Implemented | N+1 → 1회 배치로 최적화 |
| Zombie query 제거 | ✅ Implemented | agent_logs IN 쿼리로 개선 |
| Bulk API 통합 테스트 | ✅ Implemented | 7개 시나리오 커버 |
| Permission test (viewer) | ✅ Implemented | RBAC 검증 포함 |
| Timeout 시나리오 | ✅ Implemented | jest.useFakeTimers 사용 |

## Build Verification
- Root tests: 361 passed (was 354) ✅
- Web tests: 94 passed (unchanged) ✅
- Total: 455 tests (+7)

## Gaps
1. **SELECT * daemon modules** (-3%): daemon 내 다른 모듈의 SELECT * 쿼리 미최적화
2. **Circuit breaker** (-2%): API 타임아웃 시 circuit breaker 미구현

## Summary
Queue 라우트 강화, health-monitor N+1 제거, 7개 통합 테스트 추가 완료.
API 테스트 354 → 361 (+7개). 나머지 daemon 모듈의 SELECT * 쿼리가 후속 과제.
