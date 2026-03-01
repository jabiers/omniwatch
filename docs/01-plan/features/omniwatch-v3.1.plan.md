# OmniWatch v3.1.0 Plan — Test Reliability

## Overview
v3.0 통합 이후 남아있던 5건의 pre-existing test failure를 해결하고,
웹 페이지 렌더 스모크 테스트 15건을 추가하여 테스트 기반을 강화한다.

## Background
- v3.0에서 5건의 테스트 실패가 pre-existing으로 보고됨
- 근본 원인: vitest가 `@omniwatch/daemon/engine` workspace 패키지를 mock 할 때 resolve alias 부재
- 웹 페이지 14개 중 스모크 테스트가 부족한 상태

## Goals
1. **Fix Pre-existing Failures**: vitest.config.ts에 resolve alias 추가로 5건 해결
2. **Page Smoke Tests**: 15개 페이지 렌더 스모크 테스트 추가 (login, settings, recipes, usage 등)
3. **Test Count Target**: 410 (354 root + 61 web, 기존 349 + 46에서 증가)

## Technical Approach

### 1. Vitest Resolve Alias
- `vitest.config.ts`에 `@omniwatch/daemon/engine` alias 추가
- Workspace 패키지 mock이 정상 동작하도록 경로 매핑

### 2. Page Render Smoke Tests
- 각 페이지 컴포넌트의 기본 렌더 테스트
- Provider 래핑 (ThemeProvider, AuthGuard mock)
- 주요 UI 요소 존재 여부 검증

## Scope
- ✅ vitest.config.ts resolve alias 추가
- ✅ 5건 테스트 실패 수정
- ✅ 15건 페이지 렌더 스모크 테스트 추가
- ✅ 전체 테스트 통과 확인

## Risk
- 스모크 테스트가 shallow render에 의존하므로 런타임 에러는 잡지 못함
