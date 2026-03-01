# Vigil v1.1 Plan — Quality & Security Hardening

## Overview
v1.1은 **품질 인프라 + 보안 강화 + DX 개선**. 코드 품질 게이트를 확립하고, 보안 미비점을 해결하며, 개발자 워크플로우를 자동화한다.

## Feature Groups (4개 그룹, 14개 작업)

### Group 1: Code Quality Gate — CRITICAL
- 1-1. ESLint 에러 2개 수정 (chat-handler no-useless-assignment, code-generator preserve-caught-error)
- 1-2. ESLint 경고 16개+ 해결 (미사용 변수, 미사용 파라미터)
- 1-3. CI에 lint 체크 추가 (ci.yml에 pnpm lint step)
- 1-4. Vitest coverage 설정 (@vitest/coverage-v8, 70% threshold)

### Group 2: Security Hardening — CRITICAL
- 2-1. CORS origin whitelist 설정 (환경변수 기반 허용 도메인)
- 2-2. Rate limiting 미들웨어 추가 (Hono rate-limiter, 100req/min/IP)
- 2-3. 보안 헤더 추가 (CSP, X-Frame-Options, X-Content-Type-Options, HSTS)
- 2-4. 환경변수 Zod validation schema (required/optional 구분, 타입 검증)

### Group 3: DX & Git Workflow — HIGH
- 3-1. Husky + lint-staged 설정 (pre-commit: lint + format)
- 3-2. commitlint 설정 (Conventional Commits 강제)
- 3-3. CI에 Docker build 검증 + E2E smoke test 추가

### Group 4: Error Handling & Logging — HIGH
- 4-1. React Error Boundary 컴포넌트 (에러 UI + 복구 버튼)
- 4-2. API request correlation ID 미들웨어 (X-Request-ID 헤더)
- 4-3. 구조화된 에러 핸들러 개선 (error-handler.ts 확장, 에러 코드 체계)

## Success Criteria
- [ ] `pnpm lint` 에러 0개, 경고 0개
- [ ] CI: build + test + lint + coverage 모두 통과
- [ ] CORS whitelist + Rate limit + Security headers 적용
- [ ] Husky pre-commit hook 동작
- [ ] Coverage ≥ 70% (전체)
- [ ] Error Boundary + Correlation ID 동작
