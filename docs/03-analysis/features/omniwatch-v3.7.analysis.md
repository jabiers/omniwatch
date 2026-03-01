# OmniWatch v3.7.0 Gap Analysis

## Analysis Date: 2026-03-02
## Match Rate: 95%

## Plan vs Implementation

| Plan Item | Status | Notes |
|-----------|--------|-------|
| agent-manager SELECT id,status | ✅ Implemented | restoreRunningAgents 최적화 |
| health-monitor SELECT id,heal_count | ✅ Implemented | checkErrorAgents 최적화 |
| scheduler SELECT id,schedule | ✅ Implemented | checkSchedules 최적화 |
| anomaly-detector 7컬럼 명시 | ✅ Implemented | checkAlertRules 명시적 컬럼 |
| time-travel SELECT state_json | ✅ Implemented | restoreSnapshot 최적화 |
| chat-handler SELECT level,message | ✅ Implemented | recent logs 최적화 |
| message-queue nack 4컬럼 | ✅ Implemented | id, agent_id, payload, retry_count |
| message-queue retryDeadLetter 3컬럼 | ✅ Implemented | id, agent_id, payload |
| spawn-manager 7컬럼 명시 | ✅ Implemented | getChildAgents 최적화 |
| time-travel 테스트 mock 수정 | ✅ Implemented | SQL 문자열 매칭 수정 |

## Build Verification
- Root tests: 361 tests passed ✅
- Web tests: 94 tests passed ✅
- Total: 455 tests
- Build: 6/6 packages successful ✅

## Gaps
1. **API 라우트 추가 최적화** (-3%): agent detail, marketplace detail 등 추가 최적화 가능
2. **쿼리 인덱스 검증** (-2%): 명시적 컬럼에 맞는 covering index 미적용

## Summary
Daemon 9개 모듈의 SELECT * 쿼리를 모두 명시적 컬럼으로 교체.
time-travel 테스트 mock SQL 매칭 수정. 전체 빌드/테스트 통과.
백그라운드 작업의 메모리 사용량 및 쿼리 성능 개선.
