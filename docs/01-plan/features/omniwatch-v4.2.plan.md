# OmniWatch v4.2.0 Plan — Zod Validation + Code Cleanup

## Overview
Zod validation 커버리지를 완성하고 코드 품질을 개선한다.
snapshot restore 엔드포인트의 param validation 누락, test 파일의 unused import, ESLint .mjs 지원 부재를 해결.

## Background
- **snapshot restore**: agentId param에 Zod validation 없음
- **unused imports**: test 파일 2개에서 미사용 import 존재
- **ESLint**: .mjs 파일(scripts/)에 대한 globals 설정 미비

## Goals
1. **Zod param validation 추가**: snapshot restore endpoint의 agentId에 Zod schema 적용
2. **unused import 제거**: test 파일 2개에서 미사용 import 정리
3. **ESLint .mjs 지원**: globals 확장으로 .mjs 파일 린트 가능하게 설정

## Tasks

### Task 1: Zod Param Schema for Snapshot Restore
- POST /agents/:agentId/snapshots/restore에 Zod param validation 추가
- `z.object({ agentId: z.string().min(1) })` schema 정의
- @hono/zod-validator 활용

### Task 2: Unused Import Cleanup
- test 파일 2개에서 미사용 import 식별 및 제거
- TypeScript noUnusedLocals와 일관성 유지

### Task 3: ESLint .mjs Globals
- eslint.config.mjs에 .mjs 파일 패턴 추가
- Node.js globals (process, console, __dirname 등) 설정
- scripts/*.mjs 파일이 린트 통과하도록 수정

## Success Criteria
- [ ] Zod param schema 추가 완료
- [ ] unused import 0개
- [ ] ESLint .mjs 파일 에러 0개
- [ ] 빌드 5/5 성공
- [ ] 테스트 511개 통과
