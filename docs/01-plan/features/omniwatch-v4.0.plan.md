# OmniWatch v4.0.0 Plan — Daemon-API Package Consolidation

## Overview
`apps/daemon`을 `apps/api/src/engine/`으로 통합하여 모노레포 패키지 아키텍처를 단순화한다.
v2.0에서 initEngine()으로 동일 프로세스 실행을 구현했으나, daemon이 별도 패키지로 존재하여
불필요한 빌드 단계와 의존성 복잡도가 발생. v4.0에서 패키지 수준 통합을 완성한다.

## Background
- **v2.0 완료**: initEngine()으로 runtime 통합은 구현됨
- **현재 문제**:
  - daemon 패키지가 별도로 존재 (monorepo 패키지 6개 → 5개로 감소 기회)
  - 별도 빌드 단계 필요 (tsup)
  - 의존성 복잡도 증가 (anthropic, openai, acorn, isolated-vm 중복)
  - import 경로 복잡 (@omniwatch/daemon/engine)

## Goals
1. **daemon 소스 통합**: 43개 파일을 apps/api/src/engine/으로 이동
2. **의존성 병합**: 4개 daemon 의존성을 API에 통합
3. **빌드 단순화**: daemon 별도 tsup.config 제거, API에 engine 엔트리 추가
4. **import 경로 정리**: @omniwatch/daemon → 상대 경로 (../engine/engine.js)
5. **테스트 경로 수정**: 19개 test 파일 경로 업데이트

## Tasks

### Task 1: Daemon Files Relocation (43 files)
- `apps/daemon/src/*` 모든 파일을 `apps/api/src/engine/`으로 이동
  - agent-manager.ts, event-bus.ts, anomaly-detector.ts, etc.
  - sandbox.ts, message-queue.ts, handlers/ 디렉토리
  - index.ts → engine.ts로 이름 변경
- 이동 후 Git은 rename으로 감지 (history 보존)

### Task 2: API Route Imports Update (10 files)
- 10개 API route 파일의 daemon import 경로 수정
  - `import { ... } from '@omniwatch/daemon/engine'`
  - → `import { ... } from '../engine/engine.js'`
- routes/agents, recipes, queue, analytics, tenants, etc.

### Task 3: Dependencies Merge
- `apps/api/package.json`에 daemon 의존성 통합
  - anthropic, openai, acorn, isolated-vm
- `apps/daemon/package.json` 삭제
- `apps/web/package.json`에서 @omniwatch/daemon 제거

### Task 4: Build Configuration
- `apps/api/tsup.config.ts` 수정: engine 엔트리 포인트 추가
- 기존 agent/runtime entries 유지
- `apps/daemon/tsup.config.ts` 삭제

### Task 5: Web Instrumentation & Config
- `apps/web/src/instrumentation.ts`: daemon import 경로 수정
- `apps/web/next.config.ts`: daemon external 항목 제거

### Task 6: Test Paths (19 files)
- vitest.config.ts alias 업데이트
- 19개 test 파일의 daemon import 경로 수정
- apps/daemon/src/__tests__/* → 해당 apps/api/src/engine/__tests__/*

### Task 7: Cleanup
- daemon 패키지 디렉토리 전체 삭제
- README.md: 프로젝트 구조 섹션 업데이트 (패키지 6 → 5)
- scripts/sync-version.mjs: daemon 엔트리 제거
- pnpm-workspace.yaml: daemon 제거

## Success Criteria
- [ ] 43개 파일 이동 완료 (Git rename 인식)
- [ ] 10개 API route import 경로 수정
- [ ] 4개 의존성 병합 완료
- [ ] tsup 빌드 성공 (5 packages)
- [ ] 모든 테스트 통과 (511/511)
- [ ] 0개 @omniwatch/daemon 참조 남음
