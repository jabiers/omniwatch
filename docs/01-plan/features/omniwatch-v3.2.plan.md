# OmniWatch v3.2.0 Plan — Code Quality

## Overview
공통 유틸리티 함수(`getErrorMessage`, `safeJsonParse`)를 추출하고,
API 전반의 에러 처리 패턴과 JSON 파싱을 표준화한다.

## Background
- API 라우트 전반에서 `(error as Error).message` 패턴 반복 사용
- `JSON.parse` 호출 시 try-catch 없이 사용하는 케이스 존재 (marketplace 등)
- Auth 에러 메시지에 trailing period 불일치

## Goals
1. **Shared Utilities**: `getErrorMessage()`, `safeJsonParse()` 유틸리티 생성
2. **JSON.parse Replacement**: marketplace.ts의 8개 JSON.parse를 safeJsonParse로 교체
3. **Error Pattern Standardization**: 7개 API 라우트 파일의 에러 추출 패턴 통일
4. **Auth Message Consistency**: trailing period 제거로 에러 메시지 일관성 확보
5. **Utility Tests**: 5건 추가 (getErrorMessage: 2 + safeJsonParse: 3)

## Technical Approach

### 1. Utility Functions
- `packages/shared/src/utils.ts`에 구현
- `getErrorMessage(unknown): string` — 안전한 에러 메시지 추출
- `safeJsonParse<T>(string, T): T` — 실패 시 fallback 반환

### 2. API Route Refactoring
- 대상: agents, chat, mesh, snapshots, recipes, marketplace, auth middleware
- `catch (e) { message: (e as Error).message }` → `getErrorMessage(e)`
- `JSON.parse(data)` → `safeJsonParse(data, fallback)`

## Scope
- ✅ getErrorMessage() 유틸리티 생성
- ✅ safeJsonParse() 유틸리티 생성
- ✅ marketplace.ts JSON.parse 8건 교체
- ✅ 7개 API 라우트 에러 패턴 교체
- ✅ Auth 에러 메시지 trailing period 통일
- ✅ 유틸리티 테스트 5건 추가

## Risk
- 기존 에러 메시지 형식에 의존하는 클라이언트 코드가 있을 수 있음
