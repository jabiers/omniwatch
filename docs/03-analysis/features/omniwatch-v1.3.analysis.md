# Vigil v1.3 Gap Analysis Report

## Overview
- **Date**: 2026-03-01
- **Match Rate**: 99%
- **Status**: PASS

## Results

| Group | Item | Status |
|-------|------|--------|
| Version Sync | 1-1. All 7 package.json at 1.3.0 | MATCH |
| Version Sync | 1-2. Build-time version injection (APP_VERSION from shared) | MATCH |
| Version Sync | 1-3. scripts/sync-version.mjs + version:sync script | MATCH |
| WebSocket UI | 2-1. Global WS status store (ws-store.ts) | MATCH |
| WebSocket UI | 2-2. Layout dynamic status indicator | MATCH |
| Developer Experience | 3-1. Bundle analyzer | MATCH |
| Developer Experience | 3-2. Configurable log level (LOG_LEVEL env) | MATCH |
| Developer Experience | 3-3. E2E API tests (5 tests) | MATCH |

## Metrics
- Build: 6/6 packages successful
- Root Tests: 352/352 passed (34 files)
- Web Tests: 24/24 passed (6 files)
- ESLint: 0 errors, 0 warnings
- TypeScript: 0 errors
- Total test count: 376 (352 root + 24 web)
- E2E tests: 5 (separate config, requires running API server)
