# OmniWatch v2.5 Plan — Error Handling & Test Coverage

## Summary

Silent catch 블록에 로깅 추가, 핵심 모듈 테스트 보강.

## Tasks

| # | Task | Description |
|---|------|-------------|
| 1 | Fix silent catches in engine.ts | Alert check `.catch(() => {})` → 로그 추가 |
| 2 | Fix silent catches in self-healer.ts | Notification failure → 로그 추가 |
| 3 | Fix silent catches in anomaly-detector.ts | Notification failure → 로그 추가 |
| 4 | Fix silent catch in metrics-collector.ts | recordMetric/dailyRollup → 로그 추가 |
| 5 | Add engine handler tests | initEngine/shutdownEngine lifecycle 테스트 |
| 6 | Add API route integration tests | chat, config, snapshot 라우트 테스트 |
| 7 | Version bump to 2.5.0 | 모든 패키지 버전 동기화 |
