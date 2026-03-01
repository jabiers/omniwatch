# OmniWatch v2.1 PDCA Completion Report

## Summary

v2.0 데몬-API 통합 후 발견된 보안 취약점 2건과 기술부채를 수정한 패치 릴리스.

## Issues Fixed

### P1: Marketplace Install RBAC Missing (Security)
- **Before**: `/api/marketplace/:id/install`에 RBAC 체크 없음 — viewer도 에이전트 생성 가능
- **After**: `requireRole('admin', 'operator')` 미들웨어 추가
- **Impact**: Privilege escalation 방지

### P1: Usage NaN SQL Injection (Bug)
- **Before**: `days=abc` → `NaN` → `datetime('now', '-NaN days')` → SQL 에러
- **After**: `Number.isFinite()` 검증 + 400 에러 반환 + `Math.floor` + 범위 제한 (1-365)
- **Impact**: Invalid input으로 인한 서버 에러 방지

### P2: .env.example Variable Names (Config)
- **Before**: `GITHUB_CALLBACK_URL`, `GOOGLE_CALLBACK_URL`
- **After**: `GITHUB_REDIRECT_URI`, `GOOGLE_REDIRECT_URI` (코드와 일치)
- **Impact**: OAuth 설정 시 사용자 혼란 방지

### P3: `null as any` Technical Debt (Type Safety)
- **Before**: 21개 `null as any` cast across 7 API route files
- **After**: Handler signatures에서 unused Socket 파라미터 제거, API에서 인자 불필요
- **Impact**: 타입 안전성 향상, IDE 자동완성 정상화

## Files Changed (22)

### Daemon Handlers (4)
- `handlers/agent.ts` — Remove `Socket` import + param
- `handlers/chat.ts` — Remove `Socket` import + param
- `handlers/snapshot.ts` — Remove `Socket` import + param
- `handlers/mesh.ts` — Remove `Socket` import + param

### API Routes (7)
- `routes/marketplace.ts` — RBAC + remove `null as any`
- `routes/usage.ts` — NaN validation
- `routes/agents.ts` — Remove `null as any`
- `routes/chat.ts` — Remove `null as any`
- `routes/snapshots.ts` — Remove `null as any`
- `routes/mesh.ts` — Remove `null as any`
- `routes/recipes.ts` — Remove `null as any`
- `routes/mcp.ts` — Remove `null as any`

### Config (1)
- `.env.example` — Variable names fix

### Version (8)
- All 7 package.json + shared constants → 2.1.0

## Metrics

- **Build**: 6/6 passed
- **Tests**: 351 passed, 34 files
- **Lines changed**: 83 added, 77 deleted
- **Version**: 2.0.0 → 2.1.0
