# OmniWatch v3.6.0 Plan — Query Optimization & OpenAPI

## Overview
에이전트 목록 및 마켓플레이스 조회의 불필요한 컬럼 제거,
OpenAPI 스펙에 일괄 작업 엔드포인트 추가로 쿼리 성능과 API 문서화를 개선한다.

## Background
- Agent list SELECT *에서 code 컬럼 미사용 (매우 큼)
- Marketplace list SELECT *에서 code/config/prompt 미사용 (큼)
- OpenAPI 스펙에 POST /api/agents/bulk 엔드포인트 누락
- 성능: 불필요한 컬럼 로드로 메모리/네트워크 오버헤드

## Goals
1. **Agent List Optimization**: SELECT id, name, status, ... (code 제외)
2. **Marketplace List Optimization**: SELECT id, name, description, ... (code/config/prompt 제외)
3. **OpenAPI Bulk Spec**: POST /api/agents/bulk 엔드포인트 정의
4. **Selective Load**: 상세 조회 시에만 code/config/prompt 포함

## Technical Approach

### Agent List Query
```sql
SELECT id, name, status, created_at, updated_at, last_error
FROM agents WHERE tenant_id = ?
-- Exclude: code (blob/long string)
```

### Marketplace List Query
```sql
SELECT id, name, description, author, rating, tags, version
FROM marketplace_recipes WHERE published = true
-- Exclude: code, config, prompt
```

### OpenAPI Bulk Endpoint
```yaml
/agents/bulk:
  post:
    summary: Bulk agent operations
    requestBody:
      content:
        application/json:
          schema:
            properties:
              action: [start, stop, restart, destroy]
              agentIds: [string]
    responses:
      '200':
        description: Bulk operation result
```

## Scope
- ✅ Agent list SELECT 컬럼 명시화
- ✅ Marketplace list SELECT 컬럼 명시화
- ✅ OpenAPI /agents/bulk 스펙 추가
- ✅ 테스트 (쿼리 컬럼 검증)

## Risk
- 기존 API 클라이언트가 code 컬럼 기대 가능 (하지만 v3에서 신규)
- Agent detail 조회 시 code 포함 필요
