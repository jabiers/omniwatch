# OmniWatch v1.3 Plan - Version Sync & Developer Experience

## Overview
- **Version**: 1.3.0
- **Theme**: Version Sync, WebSocket Status UI, Developer Experience
- **Priority**: HIGH

## Goals
1. Centralize version management (eliminate version mismatch across packages)
2. Add WebSocket connection status to global layout
3. Add bundle analyzer for production optimization
4. Expand E2E API tests
5. Configurable log level

## Feature Groups

### Group 1: Version Sync (3 tasks)
| ID | Task | Description |
|----|------|-------------|
| 1-1 | Centralize version | Single source of truth in root package.json, sync all sub-packages to 1.3.0 |
| 1-2 | Build-time version injection | Read version from root package.json at build time (next.config.ts, openapi.ts, system.ts) |
| 1-3 | Version sync script | Add `pnpm version:sync` to propagate root version to all packages |

### Group 2: WebSocket Status UI (2 tasks)
| ID | Task | Description |
|----|------|-------------|
| 2-1 | Global WS status store | Zustand-like store or context for WebSocket connection status |
| 2-2 | Layout status indicator | Replace hardcoded "Daemon Connected" with live WS status (connected/reconnecting/disconnected) |

### Group 3: Developer Experience (3 tasks)
| ID | Task | Description |
|----|------|-------------|
| 3-1 | Bundle analyzer | Add @next/bundle-analyzer with ANALYZE env flag |
| 3-2 | Configurable log level | Env-based log level (LOG_LEVEL=debug/info/warn/error) in shared logger |
| 3-3 | E2E API tests | Add vitest E2E tests for key API endpoints (health, agents CRUD, auth) |

## Acceptance Criteria
- All package.json files show version 1.3.0
- Version displayed in header/API/OpenAPI matches root package.json
- WebSocket status in sidebar reflects actual connection state
- `ANALYZE=true pnpm build` opens bundle analyzer
- E2E tests cover at least 5 API endpoints
- Build: 6/6, TypeScript: 0 errors, ESLint: 0 errors
