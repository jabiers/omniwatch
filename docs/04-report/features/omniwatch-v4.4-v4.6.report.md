# OmniWatch v4.4.0 ~ v4.6.0 Completion Report

## Summary
v4.4-v4.6은 REST 규약 준수, 보안 취약점 수정, 테스트 커버리지 확대, 문서 동기화에 집중한 릴리스.
DELETE 엔드포인트를 204로 표준화하고, SQL 인젝션을 수정하며, 7개 테스트를 추가.

---

## v4.4.0 — DELETE 204 + Dockerfile + PDCA Cleanup

### 변경 사항
| File | Description |
|------|-------------|
| `apps/api/src/routes/agents.ts` | DELETE 200 → 204 No Content |
| `apps/api/src/routes/analytics.ts` | DELETE 200 → 204 No Content |
| `apps/api/src/routes/marketplace.ts` | DELETE 200 → 204 No Content |
| `apps/api/src/routes/tenants.ts` | DELETE /users 200 → 204 No Content |
| `Dockerfile` | api 타겟에서 daemon COPY 라인 2줄 제거 |
| `docs/.pdca-status.json` | 8개 스테일 엔트리 제거, v4.0-v4.3 기록 추가 |
| `tests/auth-middleware.test.ts` | marketplace DELETE 기대값 200 → 204 |

### 주요 개선
- 4개 DELETE 엔드포인트를 REST 규약(204 No Content)으로 표준화
- Dockerfile에서 제거된 daemon 패키지의 잔여 COPY 라인 정리
- PDCA 상태 파일 최신화 (스테일 엔트리 제거)

### Commit: `9dbea16`
### Match Rate: 100%

---

## v4.5.0 — SQL Parameterization + DELETE Tests

### 변경 사항
| File | Description |
|------|-------------|
| `apps/api/src/routes/usage.ts` | 템플릿 리터럴 SQL → 파라미터 바인딩 (`dateModifier` + `?`) |
| `tests/api-routes.test.ts` | 7개 DELETE 엔드포인트 테스트 추가 |

### 주요 개선
- SQL 인젝션 취약점 수정: `'-${days} days'` → `datetime('now', ?)` 파라미터화
- 7개 DELETE 테스트 추가 (agents 2, analytics 1, marketplace 2, users 2)
- 테스트 카운트: 390 → 397 (+7)

### Commit: `5c33d56`
### Match Rate: 100%

---

## v4.6.0 — README Stats Sync

### 변경 사항
| File | Description |
|------|-------------|
| `README.md` | 테스트 카운트 511 → 518 (397 root + 121 web) |
| `README.ko.md` | 테스트 카운트 511 → 518 (397 root + 121 web) |

### 주요 개선
- 양 README의 테스트 통계를 최신 테스트 수(518)와 동기화

### Commit: `b74282c`
### Match Rate: 100%

---

## 전체 Metrics
- Build: 5/5 packages successful
- Tests: 518/518 passed (397 root + 121 web)
- TypeScript: 0 errors
- 평균 Match Rate: 100%

## 누적 개선 (v4.0 ~ v4.6)
- **v4.0**: Daemon-API 패키지 통합 (6 → 5 패키지)
- **v4.1**: 라우트 에러 처리 강화 (17개 핸들러)
- **v4.2**: Zod 검증 완성, 코드 클린업
- **v4.3**: README 문서 동기화
- **v4.4**: DELETE 204 표준화, Dockerfile 정리
- **v4.5**: SQL 인젝션 수정, DELETE 테스트 7개 추가
- **v4.6**: README 테스트 통계 동기화

## Tags
- `v4.4.0` → `9dbea16`
- `v4.5.0` → `5c33d56`
- `v4.6.0` → `b74282c`

## PDCA Status: Completed
