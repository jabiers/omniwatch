# OmniWatch v3.19.0 Plan — Daemon SELECT * Elimination Part 1

## Overview
데몬 모듈의 SELECT * 쿼리를 명시적 컬럼 리스트로 변환하여
보안 및 성능을 개선한다.

## Background
- API 라우트는 v3.17에서 SELECT * 완전 제거 완료
- 데몬 모듈에 5개 SELECT * 쿼리가 남아있음
- 명시적 컬럼 사용 시 불의도한 필드 노출 방지, 데이터 전송량 감소

## Goals
1. **agent-manager**: AGENT_COLUMNS 상수 정의, getAgent/listAgents 2개 쿼리 변환
2. **event-bus**: getMeshEvents 명시적 컬럼 변환 (1개)
3. **anomaly-detector**: ALERT_RULE_COLUMNS 상수 정의, alert rule 관련 4개 쿼리 변환
4. **message-queue**: dequeueMessages, getDeadLetters 2개 쿼리 변환
5. **sandbox**: getSecurityEvents 2개 쿼리 변환

## Tasks

### Task 1: agent-manager AGENT_COLUMNS (3개 쿼리)
- AGENT_COLUMNS 상수 정의: id, name, role, status, healthy, version, ai_model 등
- getAgent() 쿼리: SELECT * → SELECT AGENT_COLUMNS
- listAgents() 쿼리: SELECT * → SELECT AGENT_COLUMNS

### Task 2: event-bus Mesh Events (1개 쿼리)
- getMeshEvents() 쿼리: SELECT * → SELECT id, agent_id, type, payload, timestamp

### Task 3: anomaly-detector ALERT_RULE_COLUMNS (4개 쿼리)
- ALERT_RULE_COLUMNS 상수 정의: id, name, metric, threshold, condition, enabled 등
- getAlertRules() 쿼리: SELECT * 변환
- getAlertRuleById() 쿼리: SELECT * 변환
- listActiveAlerts() 쿼리: SELECT * 변환
- getAlertHistory() 쿼리: SELECT * 변환

### Task 4: message-queue Persistence (2개 쿼리)
- dequeueMessages() 쿼리: SELECT * → SELECT id, agent_id, payload, priority, attempts, created_at
- getDeadLetters() 쿼리: SELECT * → SELECT id, agent_id, payload, reason, created_at

### Task 5: sandbox Security (2개 쿼리)
- getSecurityEvents() 첫 번째 쿼리: SELECT * 변환
- getSecurityEvents() 두 번째 쿼리 (by action): SELECT * 변환

## Success Criteria
- [ ] AGENT_COLUMNS 상수 추가 및 2개 쿼리 변환
- [ ] ALERT_RULE_COLUMNS 상수 추가 및 4개 쿼리 변환
- [ ] event-bus, message-queue, sandbox 각 쿼리 변환
- [ ] Root 테스트: 390 통과 ✅
- [ ] Build: 6/6 packages ✅
- [ ] Grep 확인: 5개 파일 SELECT * 완전 제거
