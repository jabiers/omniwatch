# OmniWatch v3.14.0 Plan — Mesh/Snapshots Zod Validation + API Test Expansion

## Overview
Mesh events와 Snapshot capture 라우트에 Zod 검증을 추가하고,
SELECT * 쿼리를 명시적 컬럼으로 교체하며,
Mesh/Snapshots/Children 관련 API 테스트 8개를 추가한다.

## Background
- Mesh events 라우트의 limit, topic 파라미터에 검증이 없음
- Snapshot capture 시 label 길이 제한이 없어 과도한 데이터 저장 가능
- Mesh events 쿼리가 `SELECT e.*`로 불필요한 필드 반환
- Children 쿼리가 `SELECT *`로 모든 컬럼 반환
- Mesh/Snapshots/Children 엔드포인트에 대한 통합 테스트 부재

## Goals
1. **Mesh Events Zod 검증**: limit 바운드, topic 파라미터 검증
2. **Snapshot Capture Zod 검증**: label 최대 100자 제한
3. **쿼리 최적화**: mesh events `SELECT e.*` → 명시적 컬럼
4. **쿼리 최적화**: children `SELECT *` → 명시적 컬럼
5. **API 테스트 8개 추가**: mesh topology/events/subscriptions, snapshots 404/200, children 404/200

## Tasks

### Task 1: Mesh Events Zod Validation
- limit: `z.coerce.number().int().min(1).max(200).default(50)`
- topic: `z.string().max(100).optional()`
- 잘못된 입력 시 400 Bad Request 응답

### Task 2: Snapshot Capture Zod Validation
- label: `z.string().max(100).optional()`
- label이 100자 초과 시 400 에러

### Task 3: Mesh Events 쿼리 최적화
- `SELECT e.*` → 명시적 컬럼 (id, topic, source_id, target_id, payload, created_at 등)

### Task 4: Children 쿼리 최적화
- `SELECT *` → 명시적 컬럼 (id, name, status, type, parent_id 등)

### Task 5: API 테스트 8개 추가
- Mesh topology (GET /api/mesh/topology) — 200
- Mesh events (GET /api/mesh/events) — 200
- Mesh subscriptions (GET /api/mesh/subscriptions) — 200
- Snapshots 존재하지 않는 에이전트 (GET /api/agents/:id/snapshots) — 404
- Snapshots 정상 (GET /api/agents/:id/snapshots) — 200
- Children 존재하지 않는 에이전트 (GET /api/agents/:id/children) — 404
- Children 정상 (GET /api/agents/:id/children) — 200
- Snapshot capture label 검증 추가 확인

## Success Criteria
- [ ] Mesh events 라우트에 Zod 검증 적용됨
- [ ] Snapshot capture label 100자 제한 적용됨
- [ ] Mesh events 쿼리에서 `SELECT e.*` 제거됨
- [ ] Children 쿼리에서 `SELECT *` 제거됨
- [ ] API 테스트 8개 통과
- [ ] Root 테스트: 367 → 375개
- [ ] 전체 테스트: 496개 통과
