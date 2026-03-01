# OmniWatch v3.17.0 Plan — SELECT * Elimination in API Routes

## Overview
API 라우트의 SELECT * 패턴을 명시적 컬럼 지정으로 교체하여
불필요한 데이터 노출을 방지하고 쿼리 성능을 개선한다.

## Background
- v3.13에서 notifications SELECT * 제거
- v3.14에서 mesh, children SELECT * 제거
- agents, tenants, marketplace, mcp 라우트에 여전히 SELECT * 패턴 존재
- SELECT *는 스키마 변경 시 의도하지 않은 필드 노출 위험

## Goals
1. **agents.ts**: agent detail, logs, metrics 쿼리를 명시적 컬럼으로 교체
2. **tenants.ts**: 4개 CRUD 쿼리를 명시적 컬럼으로 교체
3. **marketplace.ts**: detail, publish 후 조회, install 쿼리를 명시적 컬럼으로 교체
4. **mcp.ts**: 2개 agent 쿼리를 명시적 컬럼으로 교체

## Tasks

### Task 1: agents.ts SELECT * 제거
- GET /agents/:id — agent detail 쿼리 명시적 컬럼 (id, name, type, status 등)
- GET /agents/:id/logs — logs 쿼리 명시적 컬럼 (id, agent_id, level, message 등)
- GET /agents/:id/metrics — metrics 쿼리 명시적 컬럼 (id, agent_id, cpu, memory 등)

### Task 2: tenants.ts SELECT * 제거
- GET /tenants — 목록 조회 명시적 컬럼
- GET /tenants/:id — 상세 조회 명시적 컬럼
- POST /tenants — 생성 후 조회 명시적 컬럼
- PUT /tenants/:id — 수정 후 조회 명시적 컬럼

### Task 3: marketplace.ts SELECT * 제거
- GET /marketplace/:id — 상세 조회 명시적 컬럼
- POST /marketplace — publish 후 조회 명시적 컬럼
- POST /marketplace/:id/install — install 시 조회 명시적 컬럼

### Task 4: mcp.ts SELECT * 제거
- agent 조회 2개 쿼리 명시적 컬럼 (id, name, type, status 등)

## Success Criteria
- [ ] agents.ts의 SELECT * 0건
- [ ] tenants.ts의 SELECT * 0건
- [ ] marketplace.ts의 SELECT * 0건
- [ ] mcp.ts의 SELECT * 0건
- [ ] API 라우트 전체 SELECT * 0건
- [ ] 전체 테스트: 496개 통과 (375 root + 121 web)
