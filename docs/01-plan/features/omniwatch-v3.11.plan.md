# OmniWatch v3.11.0 Plan — CI Coverage & DX Scripts

## Overview
CI 파이프라인에 테스트 커버리지 리포팅을 추가하고,
개발 생산성을 높이는 편의 스크립트를 도입한다.

## Background
- CI에서 테스트 실행만 하고 커버리지 보고서를 생성/보관하지 않음
- 개발자가 자주 사용하는 명령(커버리지, 웹 테스트, 전체 개발 서버, Docker 빌드)에 대한 단축 스크립트 부재
- 새 기여자가 프로젝트에 참여할 때 명령어를 일일이 찾아야 하는 불편함

## Goals
1. **CI 커버리지**: vitest coverage 단계 추가 + 아티팩트 업로드 (14일 보관)
2. **DX 스크립트 5종**: 자주 쓰는 명령을 package.json 스크립트로 등록

## Tasks

### Task 1: CI 커버리지 단계 추가
- `.github/workflows/ci.yml`에 vitest coverage 단계 추가
- 커버리지 리포트를 아티팩트로 업로드 (14일 retention)
- 기존 테스트 단계와 별도 실행

### Task 2: DX 스크립트 추가
- `test:coverage` — 커버리지 포함 테스트 실행
- `test:web` — 웹 패키지 테스트만 실행
- `dev:all` — 전체 개발 서버 동시 실행
- `docker:build:api` — API Docker 이미지 빌드
- `docker:build:web` — Web Docker 이미지 빌드

## Success Criteria
- [ ] CI 워크플로우에 coverage 단계 존재
- [ ] 커버리지 아티팩트 업로드 설정 (14일 retention)
- [ ] package.json에 5개 새 스크립트 등록
- [ ] 빌드 6/6 + 테스트 477 통과
