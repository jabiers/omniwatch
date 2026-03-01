# OmniWatch v2.4 Gap Analysis — Type Safety & Validation

## Summary

프로덕션 코드 `as any` 제거, Zod 검증 확대, 구조화 로거 통일.

## Implementation Checklist

| Task | Status |
|------|--------|
| Remove `as any` — analytics handler | Done |
| Remove `as any` — metrics-collector (2 instances) | Done |
| Remove `as any` — error-handler | Done |
| Zod validation — chat routes (3 endpoints) | Done |
| Zod validation — config route | Done |
| Zod validation — snapshots route | N/A (optional body) |
| Logger — API index.ts | Done |
| Logger — error-handler middleware | Done |
| Logger — request logger middleware | Done |
| Version bump to 2.4.0 | Done |

## Verification

| Check | Result |
|-------|--------|
| `pnpm build` | 6/6 packages passed |
| `npx vitest run` | 339 tests, 33 files passed |
| `as any` in apps/ | 0 remaining |
| console.log in API server | 0 remaining |

## Match Rate

**100%** — All planned tasks implemented and verified.
