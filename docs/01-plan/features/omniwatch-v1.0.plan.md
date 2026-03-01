# Vigil v1.0 Plan — Stable Release

## Overview
v1.0은 **안정적인 첫 공식 릴리스**. 타입 오류 0개, 린트 설정, Docker 완전 지원, 릴리스 워크플로우.

## Feature Groups (4개 그룹, 8개 작업)

### Group 1: TypeScript Zero Errors — CRITICAL
- 1-1. 웹 페이지 이벤트 타입 수정 (e.target.value → 올바른 캐스팅)
- 1-2. window SSR 가드 + scrollIntoView DOM 타입
- 1-3. daemon void 체크 + API route.ts 모듈 선언

### Group 2: Lint & Format — HIGH
- 2-1. ESLint flat config + Prettier 설정
- 2-2. package.json에 lint/format 스크립트 추가

### Group 3: Docker 완성 — HIGH
- 3-1. Dockerfile에 Next.js 웹 빌드 포함
- 3-2. docker-compose에 web 서비스 추가 (port 3457)

### Group 4: Release — MEDIUM
- 4-1. GitHub Actions release workflow (태그 push 시 Docker 빌드)

## Success Criteria
- [ ] `npx tsc --noEmit` 오류 0개
- [ ] ESLint + Prettier 설정 존재
- [ ] Docker로 API + Web 모두 실행 가능
- [ ] 빌드 6/6 + 테스트 352+ 통과
