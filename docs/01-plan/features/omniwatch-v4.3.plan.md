# OmniWatch v4.3.0 Plan — README/Documentation Sync

## Overview
README 문서를 v4.0-v4.2 변경사항과 동기화한다.
패키지 통합, 에러 핸들링 강화, 코드 품질 개선 내용을 README에 반영.

## Background
- **v4.0**: daemon → api/engine 패키지 통합 완료, 프로젝트 구조 변경
- **v4.1**: 17개 route handler에 try-catch 추가
- **v4.2**: Zod validation 확장, unused import 정리, ESLint .mjs 지원
- README가 이 변경사항들을 반영하지 않음

## Goals
1. **v4.0 패키지 통합 섹션 추가**: README.md에 패키지 구조 변경 문서화
2. **에러 핸들링 bullet 추가**: Security/Reliability 섹션에 에러 핸들링 강화 기록
3. **한국어 README 프로젝트 구조 업데이트**: README.ko.md의 프로젝트 구조를 5개 패키지로 수정

## Tasks

### Task 1: README.md — v4.0 Section
- Architecture 또는 Changelog 섹션에 v4.0 패키지 통합 설명 추가
- 프로젝트 구조: 6 packages → 5 packages (daemon 제거, engine 통합)

### Task 2: README.md — Error Handling Bullet
- Features 또는 Security 섹션에 route error handling 추가
- "All async route handlers protected with structured JSON error responses"

### Task 3: README.ko.md — Project Structure Update
- 프로젝트 구조 섹션의 패키지 목록 업데이트
- apps/daemon 제거, apps/api/src/engine 추가 설명

## Success Criteria
- [ ] README.md에 v4.0 통합 내용 반영
- [ ] 에러 핸들링 bullet 추가
- [ ] README.ko.md 프로젝트 구조 5개 패키지로 업데이트
