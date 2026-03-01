# OmniWatch v4.7.0 ~ v4.9.0 Completion Report

## Summary
v4.7-v4.9는 보안 취약점 수정, 성능 최적화, API 일관성 개선에 집중한 릴리스.
테넌트 격리 누락을 수정하고, 벌크 작업의 N+1 쿼리를 최적화하며, 응답 형식을 표준화.

---

## v4.7.0 — Tenant Isolation + Numeric ID Validation

### 변경 사항
| File | Description |
|------|-------------|
| `apps/api/src/routes/agents.ts` | agents/:id/logs, metrics에 tenant_id 검증 추가 |
| `apps/api/src/routes/analytics.ts` | alerts PUT/DELETE에 Zod numericIdParam 적용 |
| `apps/api/src/routes/queue.ts` | dead-letters/:id/retry에 Zod numericIdParam 적용 |
| `tests/api-routes.test.ts` | 테넌트 격리 4개 + 숫자 ID 검증 4개 테스트 추가 |

### 주요 개선
- 에이전트 로그/메트릭 접근 시 테넌트 격리 적용 (보안 수정)
- 수동 isNaN → Zod param 검증으로 통일
- 테스트 397 → 405 (+8)

### Commit: `3af13aa`
### Match Rate: 100%

---

## v4.8.0 — Bulk N+1 Fix + 201 Response Standardization

### 변경 사항
| File | Description |
|------|-------------|
| `apps/api/src/routes/agents.ts` | 벌크 테넌트 격리: N개 쿼리 → IN 절 단일 쿼리 |
| `apps/api/src/routes/analytics.ts` | POST alerts 201: `rule` → `{ rule }` 래퍼 |
| `apps/api/src/routes/tenants.ts` | POST tenants 201: `tenant` → `{ tenant }` 래퍼 |
| `tests/api-routes.test.ts` | tenant 생성 테스트 기대값 수정 |

### 주요 개선
- 벌크 50개 에이전트 시 50 쿼리 → 1 쿼리로 최적화
- 모든 POST 201 응답이 일관된 래퍼 객체 사용

### Commit: `2d1438f`
### Match Rate: 100%

---

## v4.9.0 — README Stats Sync

### 변경 사항
| File | Description |
|------|-------------|
| `README.md` | 테스트 카운트 518 → 526 (405 root + 121 web) |
| `README.ko.md` | 테스트 카운트 518 → 526 (405 root + 121 web) |

### 주요 개선
- 양 README의 테스트 통계를 최신 테스트 수(526)와 동기화

### Commit: `30ebeeb`
### Match Rate: 100%

---

## 전체 Metrics
- Build: 5/5 packages successful
- Tests: 526/526 passed (405 root + 121 web)
- TypeScript: 0 errors
- 평균 Match Rate: 100%

## 누적 개선 (v4.0 ~ v4.9)
- **v4.0**: Daemon-API 패키지 통합 (6 → 5 패키지)
- **v4.1**: 라우트 에러 처리 강화 (17개 핸들러)
- **v4.2**: Zod 검증 완성, 코드 클린업
- **v4.3**: README 문서 동기화
- **v4.4**: DELETE 204 표준화, Dockerfile 정리
- **v4.5**: SQL 인젝션 수정, DELETE 테스트 7개 추가
- **v4.6**: README 테스트 통계 동기화
- **v4.7**: 테넌트 격리 수정 + 숫자 ID Zod 검증 + 8개 테스트
- **v4.8**: 벌크 N+1 최적화 + 201 응답 래퍼 표준화
- **v4.9**: README 테스트 통계 동기화

## Tags
- `v4.7.0` → `3af13aa`
- `v4.8.0` → `2d1438f`
- `v4.9.0` → `30ebeeb`

## PDCA Status: Completed
