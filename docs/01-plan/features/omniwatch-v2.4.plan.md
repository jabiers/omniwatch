# OmniWatch v2.4 Plan — Type Safety & Validation

## Summary

`as any` 패턴 제거, 미검증 API 라우트에 Zod 스키마 추가, console.log → 구조화 로거 통일.

## Tasks

| # | Task | Description |
|---|------|-------------|
| 1 | Remove `as any` (4건) | analytics handler, metrics-collector (2), error-handler |
| 2 | Zod validation — chat routes | chat 3개 POST 엔드포인트에 스키마 추가 |
| 3 | Zod validation — config route | config PUT 엔드포인트에 스키마 추가 |
| 4 | Zod validation — snapshots route | snapshot POST 엔드포인트에 스키마 추가 |
| 5 | Logger consistency — API | console.log/error → shared logger 전환 |
| 6 | Logger consistency — daemon runtime | console.error → shared logger 전환 |
| 7 | Version bump to 2.4.0 | 모든 패키지 버전 동기화 |
