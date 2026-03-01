# OmniWatch v3.12.0 Plan — OpenAPI Schema Completion & Version Sync

## Overview
OpenAPI 스키마를 실제 API 구현과 일치시키고,
누락된 응답 필드와 파라미터를 보완하며,
전체 패키지 버전을 3.12.0으로 동기화한다.

## Background
- Auth login 스키마의 필드명(key)이 실제 API(apiKey)와 불일치
- Login/me 응답에 사용자 상세 필드(display_name, avatar_url, provider) 누락
- Notifications 엔드포인트에 severity 필터 파라미터 미정의
- Security events가 별도 태그 없이 다른 라우트에 혼재
- 엔드포인트 수 설명이 구버전(65+)으로 남아있음

## Goals
1. **Auth 스키마 수정**: `key` → `apiKey` 로 실제 API와 일치
2. **사용자 객체 보완**: login/me 응답에 display_name, avatar_url, provider 추가
3. **Severity 필터**: notifications 엔드포인트에 severity query parameter 추가
4. **Security 태그 분리**: security events를 별도 "Security" 태그로 분류
5. **엔드포인트 수 업데이트**: 65+ → 70+
6. **버전 동기화**: 전체 패키지 3.12.0

## Tasks

### Task 1: Auth Login 스키마 수정
- OpenAPI에서 login request body의 `key` → `apiKey`로 변경
- 실제 API 핸들러와 일치 확인

### Task 2: 사용자 객체 응답 스키마 보완
- Login 성공 응답에 full user object 추가 (display_name, avatar_url, provider)
- `/auth/me` 응답 스키마에도 동일 필드 추가

### Task 3: Notifications Severity 필터
- GET /notifications에 `severity` query parameter 스키마 추가
- 필터 옵션: info, warning, error, critical

### Task 4: Security 태그 분리
- Security events 관련 엔드포인트를 별도 "Security" 태그로 이동
- OpenAPI 태그 목록에 Security 태그 추가

### Task 5: 버전 동기화
- 엔드포인트 수 설명 65+ → 70+ 업데이트
- 전체 패키지 버전 3.12.0으로 동기화 (sync-version.mjs)

## Success Criteria
- [ ] Auth login 스키마 `key` → `apiKey` 수정됨
- [ ] Login/me 응답에 display_name, avatar_url, provider 포함
- [ ] Notifications에 severity 필터 파라미터 존재
- [ ] Security events가 별도 "Security" 태그로 분류됨
- [ ] 엔드포인트 수 70+로 업데이트
- [ ] 전체 패키지 버전 3.12.0
- [ ] 빌드 6/6 + 테스트 477 통과
