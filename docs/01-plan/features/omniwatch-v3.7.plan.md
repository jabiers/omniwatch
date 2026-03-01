# OmniWatch v3.7.0 Plan — Daemon Query Optimization

## Overview
데몬(엔진) 내부 9개 모듈의 SELECT * 쿼리를 명시적 컬럼으로 교체하여
불필요한 데이터 로드를 제거하고 백그라운드 작업 성능을 개선한다.

## Background
- v3.6에서 API 라우트(agent list, marketplace list) SELECT * 최적화 완료
- 데몬 모듈은 여전히 SELECT *로 전체 컬럼 로드 (code, config, prompt 등 대형 필드 포함)
- 백그라운드 모니터링/스케줄링에 불필요한 데이터 전송 → 메모리 낭비
- 9개 모듈, 총 9건의 SELECT * 최적화 대상

## Goals
1. **agent-manager**: restoreRunningAgents에서 `SELECT id, status`만 조회
2. **health-monitor**: checkErrorAgents에서 `SELECT id, heal_count`만 조회
3. **scheduler**: checkSchedules에서 `SELECT id, schedule`만 조회
4. **anomaly-detector**: checkAlertRules에서 명시적 7컬럼 조회
5. **time-travel**: restoreSnapshot에서 `SELECT state_json`만 조회
6. **chat-handler**: recent logs에서 `SELECT level, message`만 조회
7. **message-queue**: nack에서 4컬럼, retryDeadLetter에서 3컬럼 조회
8. **spawn-manager**: getChildAgents에서 명시적 7컬럼 조회

## Technical Approach

### Module-specific Queries
```sql
-- agent-manager
SELECT id, status FROM agents WHERE status = 'running'

-- health-monitor
SELECT id, heal_count FROM agents WHERE status = 'error'

-- scheduler
SELECT id, schedule FROM agents WHERE schedule IS NOT NULL

-- anomaly-detector
SELECT id, name, metric, operator, threshold, window_minutes, severity
FROM alert_rules WHERE enabled = 1

-- time-travel
SELECT state_json FROM agent_snapshots WHERE id = ?

-- chat-handler
SELECT level, message FROM agent_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?

-- message-queue (nack)
SELECT id, agent_id, payload, retry_count FROM message_queue WHERE id = ?

-- message-queue (retryDeadLetter)
SELECT id, agent_id, payload FROM dead_letters WHERE id = ?

-- spawn-manager
SELECT id, name, status, parent_id, created_at, updated_at, type
FROM agents WHERE parent_id = ?
```

## Scope
- ✅ 9개 daemon 모듈 SELECT * → 명시적 컬럼
- ✅ time-travel 테스트 mock SQL 매칭 수정
- ✅ 빌드 및 전체 테스트 통과 확인

## Risk
- 테스트 mock이 SQL 문자열에 의존하는 경우 매칭 실패 가능 (time-travel)
- 누락 컬럼이 있으면 런타임 undefined 에러 발생 가능
