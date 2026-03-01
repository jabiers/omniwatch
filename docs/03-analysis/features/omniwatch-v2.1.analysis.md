# OmniWatch v2.1 Gap Analysis — Security & Quality Fixes

## Summary

v2.0 통합 후 발견된 보안 취약점 및 기술부채 수정.

## Implementation Checklist

| Task | Status |
|------|--------|
| Marketplace install RBAC (`requireRole`) | Done |
| Usage NaN SQL fix (`Number.isFinite` guard) | Done |
| .env.example variable names (REDIRECT_URI) | Done |
| Remove `null as any` (21 occurrences, 7 files) | Done |
| Remove unused `Socket` import (4 handler files) | Done |
| Version bump to 2.1.0 | Done |

## Verification

| Check | Result |
|-------|--------|
| `pnpm build` | 6/6 packages passed |
| `npx vitest run` | 351 tests, 34 files passed |
| `null as any` remaining | 0 in apps/ |
| `_client: Socket` remaining in handlers | 0 (except log.ts streamLogs which uses client) |

## Match Rate

**100%** — All planned tasks implemented and verified.
