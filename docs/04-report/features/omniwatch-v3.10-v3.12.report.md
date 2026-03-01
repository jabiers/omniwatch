# OmniWatch v3.10.0 ~ v3.12.0 Completion Report

## Summary
v3.10-v3.12는 문서화, DX, API 스키마 정합성에 집중한 품질 릴리스.
README 동기화, 에러 응답 표준화, CI 커버리지, DX 스크립트, OpenAPI 스키마 완성을 수행.

---

## v3.10.0 — README Sync & Error Response Standardization

### 변경 사항
| File | Description |
|------|-------------|
| `README.md` | 테스트 수 477, 엔드포인트 70+, Quality & Security 섹션 추가 |
| `packages/shared/src/utils.ts` | ApiErrorResponse 타입 + apiError() 헬퍼 |
| `apps/api/src/routes/oauth.ts` | 에러 필드 detail → details 정규화 |

### 주요 개선
- README를 최신 프로젝트 상태와 동기화
- 공통 에러 응답 타입(ApiErrorResponse)과 헬퍼 함수(apiError()) 도입
- OAuth 에러 필드명을 전체 API와 일관되게 통일

### Match Rate: 100%

---

## v3.11.0 — CI Coverage & DX Scripts

### 변경 사항
| File | Description |
|------|-------------|
| `.github/workflows/ci.yml` | vitest coverage 단계 + 아티팩트 업로드 (14일) |
| `package.json` | 5개 DX 스크립트 추가 |

### 새 스크립트
| Script | 설명 |
|--------|------|
| `test:coverage` | 커버리지 포함 테스트 실행 |
| `test:web` | 웹 패키지 테스트만 실행 |
| `dev:all` | 전체 개발 서버 동시 실행 |
| `docker:build:api` | API Docker 이미지 빌드 |
| `docker:build:web` | Web Docker 이미지 빌드 |

### Match Rate: 100%

---

## v3.12.0 — OpenAPI Schema Completion & Version Sync

### 변경 사항
| File | Description |
|------|-------------|
| `apps/api/src/openapi.ts` | auth login key→apiKey, 사용자 객체 보완, severity 필터, Security 태그, 70+ |
| `packages/shared/src/constants.ts` | APP_VERSION 3.12.0 |
| `package.json` (all) | 버전 3.12.0 동기화 |

### 주요 개선
- OpenAPI 스키마와 실제 API 구현의 완전한 일치
- Auth login 요청 필드명 수정 (key → apiKey)
- Login/me 응답에 사용자 상세 필드 추가 (display_name, avatar_url, provider)
- Notifications 엔드포인트에 severity 필터 파라미터 추가
- Security events를 별도 "Security" 태그로 분리

### Match Rate: 100%

---

## 전체 Metrics
- Build: 6/6 packages successful ✅ (전 버전 동일)
- Tests: 477/477 passed (367 root + 110 web)
- 평균 Match Rate: 100%
- 전체 패키지 최종 버전: 3.12.0

## 누적 개선 (v3.0 ~ v3.12)
- **v3.0-v3.3**: Agent auto-restart, bulk actions, snapshot diff, recipe versioning
- **v3.4-v3.6**: Live metrics, global search, recipe YAML export, API pagination
- **v3.7-v3.9**: Notification channels, audit log, dark mode persistence, security hardening
- **v3.10-v3.12**: README sync, error standardization, CI coverage, DX scripts, OpenAPI completion

## PDCA Status: Completed ✅
