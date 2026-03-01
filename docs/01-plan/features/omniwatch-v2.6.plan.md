# OmniWatch v2.6 Plan — Performance & Cleanup

## Summary

DB 쿼리 최적화, 미사용 의존성 제거, 코드 정리.

## Tasks

| # | Task | Description |
|---|------|-------------|
| 1 | Add DB indexes | status, agent_id, period 컬럼에 인덱스 추가 |
| 2 | Add LIMIT to background queries | anomaly-detector, scheduler, health-monitor 쿼리 최적화 |
| 3 | Remove unused web dependency | apps/web에서 미사용 hono 제거 |
| 4 | Promo stats sync | v2.6 타임라인, 테스트 수 동기화 |
| 5 | README sync | v2.4~v2.6 아키텍처 변경 반영 |
| 6 | Version bump to 2.6.0 | 모든 패키지 버전 동기화 |
