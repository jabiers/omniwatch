---
version: v1.8
theme: Sync & Auth
status: planning
date: 2026-03-01
tags: [plan, pdca, v1.8]
---

# OmniWatch v1.8 Plan — Sync & Auth

## Problem Statement

CLI, README, 대시보드, API, 인증 시스템 간 전반적인 싱크 불일치. 사용자 경험이 단절되어 있음.

## Issues Found

### CRITICAL

| # | Category | Issue |
|---|----------|-------|
| 1 | CLI Auth | `omni auth` 커맨드 없음. 대시보드 로그인 페이지에서 `omni auth create-key` 안내하지만 실제 존재하지 않음 |
| 2 | Dashboard Login | 하드코딩된 role='admin', tenantId='default'. `/auth/me` 미사용. `/auth/login` 미사용 |
| 3 | README Stats | API 엔드포인트 "45+" → 실제 62개. 페이지 "15" → 실제 14개 |

### HIGH

| # | Category | Issue |
|---|----------|-------|
| 4 | Dev Backdoor | dev 모드에서 인증 없이 admin 권한 부여 (auth.ts) |
| 5 | README Endpoints | 23개 엔드포인트 미문서화 (OAuth, marketplace CRUD, security events 등) |
| 6 | API Naming | `/users/:id/rotate-key` vs docs의 `refresh-key` 불일치 |

### MEDIUM

| # | Category | Issue |
|---|----------|-------|
| 7 | Promo Stats | 프로모 SPA의 숫자들 구버전 (tests 376 → 확인 필요, endpoints 45 → 62 등) |
| 8 | Memory.md | DB 테이블 16개 → 실제 18개 |
| 9 | OAuth Users | OAuth 유저 api_key_hash 빈 문자열 |

## Scope (v1.8)

### In Scope
1. **CLI `auth` 커맨드 추가**: create-key, list-keys, rotate-key, whoami
2. **대시보드 로그인 플로우 수정**: /auth/login → Bearer token → /auth/me
3. **README 전면 업데이트**: 정확한 수치, 엔드포인트 테이블 완성, 설치/사용 가이드 정확성
4. **Dev mode 보안**: 명시적 플래그 없이 anonymous admin 차단
5. **프로모 SPA 수치 동기화**
6. **Memory.md 업데이트**

### Out of Scope (v1.9+)
- OAuth .env 설정 및 실제 GitHub/Google 연동 완성
- Tenant isolation 전체 쿼리 적용
- CLI-Daemon Unix socket 인증

## Implementation Order

1. CLI `auth` commands (create-key, list-keys, rotate-key, whoami)
2. Dashboard login flow fix (/auth/login + /auth/me + Bearer token)
3. Dev mode auth fix
4. README sync (stats, endpoints, usage guide)
5. Promo SPA stats sync
6. Memory.md update
