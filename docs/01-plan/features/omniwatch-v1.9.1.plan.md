# OmniWatch v1.9.1 Plan — Stats Sync & Accuracy

## Context
v1.9.0 릴리스 후 분석 결과, README/프로모/CLI 전반에 걸쳐 수치 불일치 발견.

## Scope
문서/코드의 통계 수치를 실측값과 동기화하는 패치 릴리스.

## Tasks

### 1. README.md 수치 동기화
- Tests: "380+ tests, 41 files" → "376 tests, 40 files"
- Endpoints: "62+ endpoints" → "65+ endpoints"
- Architecture table 업데이트

### 2. Promo SPA 수치 동기화
- `promo/src/lib/constants.ts` STATS 배열
  - Tests: 376 (현재 376 - 이미 정확)
  - Endpoints: 62 → 65
  - Releases: 16 → 15

### 3. CLI 버전 동기화
- `apps/cli/src/index.ts` line 23: `.version('0.4.0')` → APP_VERSION 사용

### 4. Gap Analysis 실행
- 수정 후 전체 빌드/테스트 통과 확인
- 분석 문서 생성

## Verification
- `pnpm build` 성공
- `npx vitest run` 전체 통과
- README/Promo 수치 = 실측값
