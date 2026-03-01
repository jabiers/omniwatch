# Vigil v1.1 Gap Analysis Report

## Overview
- **Date**: 2026-03-01
- **Initial Match Rate**: 85% → **93%** (after Act fixes)
- **Status**: PASS

## Results

| Group | Item | Status |
|-------|------|--------|
| Code Quality | 1-1. ESLint errors fixed (2→0) | MATCH |
| Code Quality | 1-2. ESLint warnings fixed (72→0) | MATCH |
| Code Quality | 1-3. CI lint step added | MATCH |
| Code Quality | 1-4. Vitest coverage with thresholds | MATCH |
| Security | 2-1. CORS origin whitelist (null block) | MATCH |
| Security | 2-2. Rate limiting (100/min, headers) | MATCH |
| Security | 2-3. Security headers (6 headers) | MATCH |
| Security | 2-4. Zod env validation schema | MATCH |
| DX | 3-1. Husky + lint-staged | MATCH |
| DX | 3-2. commitlint conventional commits | MATCH |
| DX | 3-3. CI Docker build (api + web) | MATCH |
| Error | 4-1. React Error Boundary | MATCH |
| Error | 4-2. Correlation ID middleware | MATCH |
| Error | 4-3. Structured error handler | MATCH |

## Act Phase Fixes
- CORS: `allowedOrigins[0]` → `null` (block non-whitelisted)
- Error handler: added `code` field + `timestamp` + env-based stack
- Coverage: added thresholds (lines:70, functions:70, branches:60)
- @vitest/coverage-v8: ^4.0.18 → ^2.1.0 (match vitest)
- CI pnpm: v9 → v10 (match packageManager)
- CI: added Docker web build step

## Metrics
- Build: 6/6 packages successful
- Tests: 352/352 passed (34 files)
- ESLint: 0 errors, 0 warnings
- TypeScript: 0 errors
- Husky: pre-commit + commit-msg hooks active
