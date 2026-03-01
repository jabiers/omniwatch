# OmniWatch v3.16.0 ~ v3.18.0 Completion Report

## Summary
v3.16-v3.18는 Zod 검증 통일, SELECT * 제거, API 테스트 확대에 집중한 품질 릴리스.
전체 API 입력 검증을 zValidator로 통일하고, API 라우트의 SELECT * 패턴을 완전 제거하며,
15개 통합 테스트를 추가하여 커버리지를 확대.

---

## v3.16.0 — Zod Validation Completion

### 변경 사항
| File | Description |
|------|-------------|
| `apps/api/src/routes/recipes.ts` | listRecipesSchema 추가, q max 200 / category max 50 검증 |
| `apps/api/src/routes/usage.ts` | usageQuerySchema 추가, 수동 parseInt 검증 제거 |
| `apps/api/src/routes/oauth.ts` | oauthCallbackSchema 추가, GitHub/Google 콜백 검증 |

### 주요 개선
- 전체 API 입력 검증을 zValidator로 통일
- 수동 파라미터 검증 코드 완전 제거
- OAuth 콜백의 누락 파라미터에 대한 명확한 400 에러 응답

### Match Rate: 100%

---

## v3.17.0 — SELECT * Elimination in API Routes

### 변경 사항
| File | Description |
|------|-------------|
| `apps/api/src/routes/agents.ts` | detail, logs, metrics 쿼리 명시적 컬럼 |
| `apps/api/src/routes/tenants.ts` | 4개 CRUD 쿼리 명시적 컬럼 |
| `apps/api/src/routes/marketplace.ts` | detail, publish 후 조회, install 쿼리 명시적 컬럼 |
| `apps/api/src/routes/mcp.ts` | 2개 agent 쿼리 명시적 컬럼 |

### 주요 개선
- API 라우트 전체 SELECT * 0건 달성
- 불필요한 데이터 노출 방지
- 스키마 변경 시 의도하지 않은 필드 노출 위험 제거

### Match Rate: 100%

---

## v3.18.0 — API Test Coverage Expansion

### 변경 사항
| File | Description |
|------|-------------|
| `tests/api-routes.test.ts` | recipes 테스트 4개 추가 (list, search, category, 404) |
| `tests/api-routes.test.ts` | usage 테스트 4개 추가 (기본, days, 최소/최대 검증) |
| `tests/api-routes.test.ts` | tenants 테스트 3개 추가 (list, 생성, 검증 실패) |
| `tests/api-routes.test.ts` | marketplace 테스트 2개 추가 (detail 200/404) |
| `tests/api-routes.test.ts` | auth 테스트 2개 추가 (검증 실패, 401) |

### 주요 개선
- 15개 통합 테스트 추가로 미검증 엔드포인트 커버리지 확보
- Root 테스트 375 → 390 (+15)
- 주요 API의 정상/에러 케이스 모두 검증

### Match Rate: 100%

---

## 전체 Metrics
- Build: 6/6 packages successful ✅ (전 버전 동일)
- Tests: 511/511 passed (390 root + 121 web)
- TypeScript: 0 errors
- 평균 Match Rate: 100%

## 누적 개선 (v3.0 ~ v3.18)
- **v3.0-v3.3**: 통합 서버, 테스트 신뢰성, 코드 품질, 보안
- **v3.4-v3.6**: 대시보드 테스트, API 강화, 쿼리 최적화
- **v3.7-v3.9**: 데몬 쿼리 최적화, 페이지 테스트, 보안 강화
- **v3.10-v3.12**: README 동기화, CI 커버리지, OpenAPI 완성
- **v3.13-v3.15**: 상세 페이지 테스트, Zod 검증 확대, 타입 안전성 정리
- **v3.16-v3.18**: Zod 검증 통일, SELECT * 제거, API 테스트 확대

## PDCA Status: Completed ✅
