# Vigil v0.8 Plan — Production Readiness

## Overview
v0.7까지 기능 구현에 집중했다면, v0.8은 **프로덕션 배포 가능한 품질**로 끌어올리는 버전.
보안 취약점 수정, 테스트 커버리지 확대, DevOps 인프라, API 문서화, UX 개선에 집중한다.

## Feature Groups (4개 그룹, 15개 작업)

---

### Group 1: Security Hardening (보안 강화) — Priority: CRITICAL

#### 1-1. OAuth 세션 토큰 해싱
- **현황**: `oauth_sessions.token`이 평문 저장
- **목표**: SHA-256 해싱 + 비교 시 해시 매칭
- **파일**: `apps/api/src/routes/oauth.ts`, `apps/api/src/middleware/auth.ts`

#### 1-2. CSRF/State 파라미터 검증
- **현황**: GitHub/Google OAuth에 state 파라미터 없음
- **목표**: OAuth 플로우에 state 파라미터(nanoid) 생성/검증 추가
- **파일**: `apps/api/src/routes/oauth.ts`

#### 1-3. SQL LIKE 인젝션 방지
- **현황**: marketplace 검색에서 `%${search}%` 직접 삽입
- **목표**: 특수문자 이스케이프 함수 적용
- **파일**: `apps/api/src/routes/marketplace.ts`

#### 1-4. 환경변수 검증 + .env.example
- **현황**: 20개 이상의 환경변수가 산재, 문서 없음
- **목표**: 시작 시 필수 변수 검증 + `.env.example` 생성
- **파일**: 신규 `packages/shared/src/env.ts`, `.env.example`

---

### Group 2: Test Coverage (테스트 확대) — Priority: HIGH

#### 2-1. API 라우트 통합 테스트
- **현황**: 14개 API 라우트 파일에 테스트 0개
- **목표**: 주요 라우트 테스트 (agents, analytics, marketplace, oauth, tenants, queue)
- **방법**: Hono `app.request()` 기반 통합 테스트, in-memory SQLite
- **파일**: `tests/api-agents.test.ts`, `tests/api-analytics.test.ts` 등 6개

#### 2-2. Auth 미들웨어 테스트
- **현황**: auth.ts, error-handler.ts 테스트 없음
- **목표**: API key 검증, RBAC, Bearer 토큰, 에러 응답 포맷 검증
- **파일**: `tests/auth-middleware.test.ts`

#### 2-3. E2E 테스트 (Playwright)
- **현황**: E2E 테스트 없음
- **목표**: 핵심 플로우 5개 — 로그인, 에이전트 CRUD, 대시보드 로드, 마켓플레이스, 설정
- **파일**: `e2e/` 디렉토리, `playwright.config.ts`

---

### Group 3: DevOps & Infrastructure — Priority: HIGH

#### 3-1. Docker 컨테이너화
- **목표**: 멀티스테이지 Dockerfile + docker-compose.yml
- **구성**: daemon + api + web 통합 컨테이너 (또는 분리)
- **파일**: `Dockerfile`, `docker-compose.yml`, `.dockerignore`

#### 3-2. GitHub Actions CI/CD
- **목표**: PR 시 lint + typecheck + test, main push 시 Docker 빌드
- **파일**: `.github/workflows/ci.yml`, `.github/workflows/release.yml`

#### 3-3. 환경별 설정 분리
- **현황**: dev/production 분기가 코드 내 하드코딩
- **목표**: 환경별 config 로딩 시스템
- **파일**: `packages/shared/src/config.ts` 확장

---

### Group 4: UX & API 개선 — Priority: MEDIUM

#### 4-1. 글로벌 에러 토스트
- **현황**: 모든 페이지에서 API 에러 시 silent fail
- **목표**: 전역 에러 토스트 컴포넌트 + fetch wrapper
- **파일**: `apps/web/src/components/toast.tsx`, `apps/web/src/lib/api.ts`

#### 4-2. 페이지네이션 통합
- **현황**: notifications만 부분적 페이지네이션, 나머지 무한 로드
- **목표**: 공통 Pagination 컴포넌트 + API 표준 쿼리 (limit, offset, total)
- **파일**: `apps/web/src/components/pagination.tsx`, API 라우트 수정

#### 4-3. WebSocket 강화
- **현황**: 대시보드만 WS 사용, heartbeat 없음
- **목표**: WS heartbeat(30s ping/pong) + 에이전트 로그 실시간 스트리밍 + 재연결 로직
- **파일**: `apps/api/src/ws.ts`, `apps/web/src/lib/ws.ts`

#### 4-4. OpenAPI 스펙 자동 생성
- **현황**: API 문서 없음
- **목표**: Hono의 OpenAPI 지원으로 `/api/docs` Swagger UI 제공
- **파일**: `apps/api/src/openapi.ts`, 라우트에 스키마 추가

---

## Execution Order (실행 순서)

```
Phase 1 (Security)    → 1-1, 1-2, 1-3, 1-4        [4 tasks, 병렬 가능]
Phase 2 (Tests)       → 2-1, 2-2                   [2 tasks, 병렬 가능]
Phase 3 (DevOps)      → 3-1, 3-2, 3-3              [3 tasks, 순차]
Phase 4 (UX)          → 4-1, 4-2, 4-3              [3 tasks, 병렬 가능]
Phase 5 (E2E + Docs)  → 2-3, 4-4                   [2 tasks, 병렬 가능]
Phase 6 (Verify)      → 전체 빌드/테스트/보안 점검
```

## Success Criteria
- [ ] OAuth 토큰 해싱 + CSRF 방어 적용
- [ ] SQL 인젝션 방지 완료
- [ ] API 라우트 테스트 커버리지 > 80%
- [ ] E2E 테스트 5개 핵심 플로우 통과
- [ ] Docker 로 로컬 실행 가능
- [ ] GitHub Actions CI 동작
- [ ] 전역 에러 토스트 + 페이지네이션 적용
- [ ] OpenAPI Swagger UI 접근 가능

## Out of Scope (v0.9+)
- Kubernetes/Terraform 배포
- MCP 도구 확장 (marketplace, mesh, queue)
- 성능 최적화 (캐싱, GraphQL)
- 사용자 가이드 문서
- 커서 기반 페이지네이션
- 데이터 내보내기 기능
