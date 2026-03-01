# OmniWatch v3.3.0 Plan — Security & Performance

## Overview
에이전트 일괄 제어 API, 만료 OAuth 세션 자동 정리, 설정 가능한 rate limiter를 추가하여
운영 효율성과 보안을 강화한다.

## Background
- 다수 에이전트 관리 시 개별 API 호출 반복 필요 (N번 요청)
- OAuth 세션 만료 후에도 DB에 잔존하여 테이블 비대화
- Rate limit 값이 하드코딩 (100/min) — 환경별 튜닝 불가

## Goals
1. **Bulk Agent Operations**: POST /api/agents/bulk 엔드포인트 (start/stop/restart/destroy, max 50)
2. **OAuth Session Cleanup**: 만료 세션 hourly cron 정리
3. **Configurable Rate Limiter**: RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS 환경변수
4. **README Update**: EN + KO에 bulk endpoint 문서화

## Technical Approach

### 1. Bulk Agent Endpoint
- `POST /api/agents/bulk` — body: `{ action, agentIds[] }`
- 지원 action: start, stop, restart, destroy
- 최대 50개 에이전트 동시 처리
- 개별 결과 반환 (성공/실패 per agent)

### 2. OAuth Session Cleanup Cron
- `engine.ts`에 setInterval (1시간)
- `oauth_sessions` 테이블에서 expired_at < now() 레코드 삭제

### 3. Configurable Rate Limiter
- `RATE_LIMIT_MAX` (기본 100)
- `RATE_LIMIT_WINDOW_MS` (기본 60000)
- 기존 하드코딩 값을 환경변수로 교체

## Scope
- ✅ POST /api/agents/bulk 엔드포인트 구현
- ✅ Bulk action 최대 50개 제한
- ✅ 만료 OAuth 세션 hourly cleanup cron
- ✅ Rate limiter 환경변수 설정
- ✅ README (EN + KO) 업데이트

## Risk
- Bulk destroy는 위험 작업 — RBAC admin 권한 필요
- Cron이 서버 프로세스에 종속 — 서버 재시작 시 타이머 초기화
