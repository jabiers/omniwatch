# Vigil Changelog

All notable changes to Vigil are documented here. This file follows the [Keep a Changelog](https://keepachangelog.com/) format.

---

## [1.2.0] - 2026-03-01

### Added
- Web testing foundation with vitest + jsdom + React Testing Library (24 tests across 6 files)
- Utility tests: auth-store, toast-store, api (13 tests)
- Component tests: pagination, toast, error-boundary, auth-guard (11 tests)
- Detailed health check endpoint `/health/detailed` with database, memory, uptime metrics
- Dynamic version display in layout using `NEXT_PUBLIC_APP_VERSION` environment variable
- CONTRIBUTING.md with development setup, commit conventions, PR process guidelines
- OpenAPI schema enhancements with detailed request/response models for all endpoints
- Comprehensive accessibility improvements:
  - 40+ form input labels with proper htmlFor/id linking
  - 30+ button/icon aria-labels for interactive elements
  - 6 table elements with proper role and aria-label attributes

### Changed
- OpenAPI spec version updated from 0.8.0 to 1.2.0
- Layout.tsx version display now dynamically configured via environment variable

### Fixed
- Form accessibility: All input fields now properly labeled for screen readers
- Button accessibility: Icon buttons now have descriptive aria-labels
- Table accessibility: Data tables now have proper semantic roles and scopes

### Quality Metrics
- Design Match Rate: 93% (exceeds 90% requirement)
- Web Tests: 24/24 passing
- Root Tests: 352/352 passing
- Total Test Count: 376 tests
- Build Pass Rate: 100% (6/6 packages)
- Code Quality: 0 ESLint errors, 0 TypeScript errors

### Notes
- Page-level tests deferred to v1.3 due to Next.js App Router complexity
- Accessibility baseline established for WCAG 2.1 Level A compliance
- Testing infrastructure ready for continued TDD adoption

---

## [1.0.0] - 2026-03-01

### Added
- ESLint flat configuration with TypeScript plugin (`eslint.config.js`)
- Prettier code formatter with consistent formatting rules (`.prettierrc`)
- Docker multi-stage build with 4 stages: base, builder, api, web
- `docker-compose.yml` with api and web services for local development
- GitHub Actions release workflow (`.github/workflows/release.yml`) for automated deployments
- Complete TypeScript zero-error codebase (0 errors, down from 64)
- DOM lib support in root and app-specific tsconfig files

### Changed
- Updated `apps/web/tsconfig.json` to include DOM lib for browser APIs
- Refactored event handlers to use proper `React.ChangeEvent<T>` typing pattern
- Enhanced SSR guards in web pages with proper type narrowing
- Restructured daemon `agent-manager.ts` void expression checks for type safety
- Enhanced API route module declarations with ambient type declarations

### Fixed
- Resolved all 64 TypeScript compilation errors:
  - Event handler type errors in web pages (32 errors)
  - Window object SSR type errors (16 errors)
  - Void expression truthiness checks (8 errors)
  - Module import type declarations (8 errors)
- Fixed `scrollIntoView()` DOM method typing issues
- Fixed React event handler onChange type inference

### Verified
- 352/352 tests passing (0 failures)
- 6/6 packages building successfully
- ESLint validation passing across entire codebase
- Prettier formatting consistent
- Docker build successful for both API (port 3456) and Web (port 3457) services
- GitHub Actions release workflow operational and tested

### Quality Metrics
- Design Match Rate: 97% (exceeds 90% requirement)
- Build Pass Rate: 100% (6/6)
- Test Coverage: 352/352 (100%)
- Code Quality: Linting-compliant

---

## [0.6.0] - 2026-02-15

### Added
- Agent Sandbox with policy framework (strict/standard/permissive)
- Persistent message queue with SQLite backend
- Multi-tenant architecture with RBAC
- Analytics engine with Z-score anomaly detection

### Verified
- 11 dashboard pages fully functional
- 38+ API endpoints operational
- 16 database tables with proper schema
- Multi-provider AI support (Anthropic, OpenAI, Ollama)

---

## [0.5.0] - 2026-01-20

### Added
- Mesh event system
- Agent spawning with time travel
- MCP (Model Context Protocol) integration
- Local Brain learning system
- Glass Box debugging
- Recipe system for agent configurations

---

## [0.4.0] - 2025-12-10

### Added
- Turborepo monorepo structure
- Hono REST API with WebSocket support
- Next.js 15 Dashboard with Glass Console UI
- SQLite database with WAL mode
- Authentication with API keys and RBAC
- IPC system with Unix domain sockets

---

## Legend

- **Added**: New features or capabilities
- **Changed**: Changes in existing functionality
- **Fixed**: Bug fixes and error resolutions
- **Verified**: Tested and confirmed working

## Version Numbering

Vigil uses Semantic Versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking changes or major feature releases
- **MINOR**: New features or significant enhancements
- **PATCH**: Bug fixes and minor improvements

## Release Process

1. Create feature branch for work
2. Complete PDCA cycle (Plan → Design → Do → Check → Act)
3. Create git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. GitHub Actions automatically builds and creates release

For detailed information about specific releases, see the PDCA documents in `docs/`.
