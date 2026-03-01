# Contributing to Vigil

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 10.0.0

## Development Setup

```bash
git clone https://github.com/jabiers/vigil.git
cd vigil
pnpm install
pnpm build
```

## Running Development Servers

```bash
# API server (port 3456)
cd apps/api && pnpm dev

# Web dashboard (port 3457)
cd apps/web && pnpm dev
```

## Project Structure

```
vigil/
├── apps/
│   ├── cli/       # CLI client (Commander.js + Ink)
│   ├── daemon/    # Agent runtime + event bus
│   ├── api/       # Hono REST API + WebSocket + MCP
│   └── web/       # Next.js 15 Dashboard
├── packages/
│   ├── shared/    # Types, constants, utilities
│   └── db/        # SQLite schema + migrations
├── tests/         # Unit + integration tests
└── e2e/           # Playwright E2E tests
```

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint:

- `feat:` — New feature
- `fix:` — Bug fix
- `refactor:` — Code restructuring
- `docs:` — Documentation
- `test:` — Tests
- `chore:` — Maintenance

Example: `feat: add agent scheduling endpoint`

## Pull Request Process

1. Create a feature branch from `main`
2. Make changes following the code style guide
3. Run checks: `pnpm lint && pnpm typecheck && pnpm test`
4. Push and create a PR against `main`
5. Ensure CI passes (build, lint, test)

## Testing

```bash
# Run all tests
npx vitest run

# Run with coverage
npx vitest run --coverage

# Run web tests
cd apps/web && npx vitest run

# Run E2E tests
npx playwright test
```

## Code Style

- ESLint + Prettier configured (auto-fix on pre-commit via Husky)
- TypeScript strict mode — zero errors required
- Comments in English
