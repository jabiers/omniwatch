# OmniWatch v4.1.0 ~ v4.3.0 Completion Report

## Summary
v4.1-v4.3은 v4.0 패키지 통합 이후 코드 안정성과 문서 동기화에 집중한 품질 강화 릴리스.
비보호 라우트 핸들러에 에러 처리를 추가하고, Zod 검증 커버리지를 완성하며,
README 문서를 최신 코드베이스와 동기화.

---

## v4.1.0 — Route Error Handling Hardening

### 변경 사항
| File | Description |
|------|-------------|
| `apps/api/src/routes/analytics.ts` | 7개 핸들러 try-catch 래핑 (metrics, anomalies, alerts CRUD, security events) |
| `apps/api/src/routes/config.ts` | 1개 핸들러 try-catch 래핑 (PUT /config) |
| `apps/api/src/routes/tenants.ts` | 4개 핸들러 try-catch 래핑 (tenant CRUD, key rotation, user creation) |
| `apps/api/src/routes/oauth.ts` | 5개 핸들러 try-catch 래핑 (login, logout, me, GitHub/Google callbacks) |

### 주요 개선
- 4개 라우트 파일의 17개 async 핸들러에 try-catch 추가
- 모든 에러 응답을 `getErrorMessage()` 기반 구조화된 JSON으로 통일
- 미처리 예외로 인한 500 응답 대신 의미 있는 에러 메시지 반환

### Commit: `ffcac6e`
### Match Rate: 100%

---

## v4.2.0 — Zod Validation + Code Cleanup

### 변경 사항
| File | Description |
|------|-------------|
| `apps/api/src/routes/agents.ts` | snapshot restore `:seq` 파라미터에 Zod coerce number 스키마 추가 |
| `apps/api/tests/ws-store.test.ts` | 미사용 import 제거 (beforeEach, vi) |
| `apps/web/tests/agents.test.tsx` | 미사용 import 제거 (fireEvent) |
| `eslint.config.mjs` | ESLint globals를 전체 .mjs 파일로 확대 적용 |

### 주요 개선
- 모든 param 입력에 대한 Zod 검증 커버리지 완성
- 테스트 파일 미사용 import 0건 달성
- ESLint 설정 일관성 확보 (scripts/ 한정 → 전체 .mjs 확대)

### Commit: `6b227cf`
### Match Rate: 100%

---

## v4.3.0 — README/Documentation Sync

### 변경 사항
| File | Description |
|------|-------------|
| `README.md` | "Package Consolidation (v4.0)" 섹션 추가, Error Handling 항목 추가 |
| `README.ko.md` | "Package Consolidation (v4.0)" 섹션 추가, Error Handling 항목 추가 |
| `README.ko.md` | 프로젝트 구조에서 daemon 디렉토리 제거, engine 디렉토리 추가 |

### 주요 개선
- 영문/한국어 README 모두 v4.0-v4.2 변경 사항 반영
- 품질 및 보안 섹션에 에러 처리 강화 내용 기록
- 한국어 README 프로젝트 구조가 실제 코드베이스와 일치하도록 동기화

### Commit: `5f3a488`
### Match Rate: 100%

---

## 전체 Metrics
- Build: 5/5 packages successful
- Tests: 511/511 passed (390 root + 121 web)
- TypeScript: 0 errors
- 평균 Match Rate: 100%

## 누적 개선 (v4.0 ~ v4.3)
- **v4.0**: Daemon-API 패키지 통합 (6 → 5 패키지), 43 파일 마이그레이션
- **v4.1**: 라우트 에러 처리 강화 (17개 핸들러 try-catch)
- **v4.2**: Zod 검증 완성, 코드 클린업 (미사용 import 제거, ESLint 확대)
- **v4.3**: README 문서 동기화 (v4.0-v4.2 반영)

## Tags
- `v4.1.0` → `ffcac6e`
- `v4.2.0` → `6b227cf`
- `v4.3.0` → `5f3a488`

## PDCA Status: Completed
