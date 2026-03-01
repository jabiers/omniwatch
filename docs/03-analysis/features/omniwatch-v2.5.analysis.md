# OmniWatch v2.5 Gap Analysis — Error Handling & Test Coverage

## Summary

Silent catch 블록 로깅 추가, 새로운 API 라우트 검증 테스트 추가.

## Implementation Checklist

| Task | Status |
|------|--------|
| Fix silent catch in engine.ts (alert check) | Done |
| Fix silent catch in self-healer.ts (notification) | Done |
| Fix silent catch in self-healer.ts (snapshot) | Done |
| Fix silent catches in self-healer.ts (package.json, 2) | Done |
| Fix silent catch in anomaly-detector.ts | Done |
| Fix silent catches in metrics-collector.ts (record, daily) | Done |
| Add chat route Zod validation tests (3) | Done |
| Add preview route test (1) | Done |
| Add apply route test (1) | Done |
| Add config PUT validation tests (3) | Done |
| Fix loadConfig mock for config tests | Done |
| Version bump to 2.5.0 | Done |

## Verification

| Check | Result |
|-------|--------|
| `pnpm build` | 6/6 packages passed |
| `npx vitest run` | 349 tests, 33 files passed |
| Silent `catch {}` in daemon | 0 remaining |

## Match Rate

**100%** — All planned tasks implemented and verified.
