# OmniWatch v1.2 Plan — Testing, Observability & Documentation

## Overview
v1.2는 **테스트 기반 강화 + 관측성 개선 + 문서 완성**. 웹 앱 테스트 0개 문제 해결, 헬스체크 상세화, OpenAPI 완성, 접근성 기초.

## Feature Groups (4개 그룹, 12개 작업)

### Group 1: Web Testing Foundation — CRITICAL
- 1-1. @testing-library/react + jsdom 환경 설정 (apps/web)
- 1-2. 유틸리티 테스트: api.ts, auth-store.ts, toast-store.ts (9개+)
- 1-3. 컴포넌트 테스트: pagination, toast, error-boundary, auth-guard (8개+)
- 1-4. 페이지 테스트: login, agents, dashboard 기본 렌더링 (6개+)

### Group 2: Observability — HIGH
- 2-1. 상세 헬스체크 엔드포인트 (/health/detailed) — DB, queue, uptime, memory
- 2-2. 버전 동기화 — layout.tsx v0.7.0 하드코딩 → NEXT_PUBLIC_APP_VERSION
- 2-3. OpenAPI spec 버전 동기화 (0.8.0 → 1.2.0)

### Group 3: Documentation — HIGH
- 3-1. CONTRIBUTING.md 작성 (dev setup, commit rules, PR process)
- 3-2. OpenAPI 엔드포인트 스키마 보강 (request/response body 상세화)

### Group 4: Accessibility Basics — MEDIUM
- 4-1. 폼 접근성: 모든 input에 label 연결 (htmlFor + id)
- 4-2. 버튼/아이콘 aria-label 추가 (사이드바, 헤더, 액션 버튼)
- 4-3. 테이블/리스트 aria 속성 (role, aria-label on interactive rows)

## Success Criteria
- [ ] 웹 테스트 20개+ 통과 (vitest + jsdom)
- [ ] /health/detailed 엔드포인트 동작
- [ ] layout.tsx 버전 동적 표시
- [ ] CONTRIBUTING.md 존재
- [ ] OpenAPI spec 전체 엔드포인트 커버
- [ ] 주요 폼/버튼에 aria-label 적용
