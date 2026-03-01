# OmniWatch v0.9 Plan — Code Quality & Consistency

## Overview
v0.8에서 프로덕션 인프라를 갖췄다면, v0.9는 **코드 품질 통일과 UX 일관성**에 집중.
TypeScript strict 오류 수정, apiFetch 전환, 페이지네이션 확산, WebSocket 실시간 연동, README 갱신.

## Feature Groups (4개 그룹, 12개 작업)

---

### Group 1: TypeScript Strict Mode (타입 안전성) — CRITICAL

#### 1-1. Web 페이지 타입 수정
- **현황**: 91개 strict 오류 (unknown 캐스팅, 이벤트 타입, DOM API)
- **목표**: 모든 page.tsx에 API 응답 타입 정의, 이벤트 핸들러 타입 어노테이션
- **범위**: apps/web/src/app/**/*.tsx (13개 페이지)

#### 1-2. Daemon/API 타입 수정
- **현황**: agent-manager.ts 보안 이벤트 타입, api/index.ts 서버 타입
- **목표**: 나머지 strict 오류 제거
- **범위**: apps/daemon/src/, apps/api/src/

---

### Group 2: apiFetch 전환 (일관된 에러 처리) — HIGH

#### 2-1. 전체 페이지 apiFetch 마이그레이션
- **현황**: agents만 apiFetch 사용, 나머지 13개 페이지는 raw fetch
- **목표**: 모든 페이지에서 apiFetch 사용 → 자동 에러 토스트
- **범위**: dashboard, analytics, agents/[id], agents/new, marketplace, mesh, notifications, queue, recipes, tenants, usage, settings, login

---

### Group 3: 페이지네이션 + WebSocket 확산 — HIGH

#### 3-1. 리스트 페이지에 Pagination 적용
- **현황**: agents만 페이지네이션 있음
- **목표**: marketplace, queue(dead letters), mesh, notifications에 적용
- **범위**: 4개 페이지

#### 3-2. WebSocket broadcast 실시간 연동
- **현황**: broadcast() 정의만 되고 호출 없음
- **목표**: 에이전트 상태 변경 시 broadcast → 대시보드 자동 갱신
- **범위**: apps/api/src/routes/agents.ts → broadcast 호출 추가

---

### Group 4: 문서 + 마무리 — MEDIUM

#### 4-1. README v0.9 업데이트
- **현황**: Docker, CI, OpenAPI, 보안 강화 등 v0.8 기능 미반영
- **목표**: 전체 기능 목록, 빠른 시작(Docker), API 문서 링크 추가

#### 4-2. apiFetch에 성공 토스트 활용
- **목표**: 에이전트 생성/삭제/시작/정지 시 성공 토스트 표시
- **범위**: agents/page.tsx, agents/[id]/page.tsx, agents/new/page.tsx

---

## Execution Order

```
Phase 1 → Group 1 (1-1, 1-2) — TS strict 수정 [병렬]
Phase 2 → Group 2 (2-1) — apiFetch 전환
Phase 3 → Group 3 (3-1, 3-2) — 페이지네이션 + WS [병렬]
Phase 4 → Group 4 (4-1, 4-2) — README + 성공 토스트
Phase 5 → 빌드/테스트/Gap 분석
```

## Success Criteria
- [ ] `npx tsc --noEmit` 오류 0개
- [ ] 모든 페이지 apiFetch 사용 (raw fetch 0개)
- [ ] 리스트 페이지 4개에 Pagination 적용
- [ ] WebSocket broadcast 호출 1건 이상
- [ ] README에 v0.8+ 기능 반영
- [ ] 빌드 6/6 + 테스트 352+ 통과
