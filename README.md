**English** | [한국어](README.ko.md)

# OmniWatch

> AI-powered autonomous monitoring platform — **"Don't Config, Just Speak"**

OmniWatch is a platform where you describe what you want in plain language, and AI automatically generates, runs, monitors, and self-heals background agents 24/7. It ships with a CLI and a unified web server that serves both the dashboard and REST API on a single port.

```
$ omni watch "Alert me when AirPods Pro drops below $250 on Amazon"
Agent [amazon-airpods] created and running.

$ omni list
ID              NAME                STATUS    LAST CHECK
agent-a1b2      amazon-airpods      running   30s ago
agent-c3d4      btc-price-alert     running   10s ago
agent-e5f6      hackernews-ai       running   2m ago
```

## Quick Start

### Docker (Recommended)

```bash
docker compose up -d
# API at http://localhost:3456
# API Docs at http://localhost:3456/api/docs
```

### From Source

```bash
git clone https://github.com/jabiers/omniwatch.git
cd omniwatch
pnpm install
pnpm build

# Start everything (API + Dashboard)
pnpm dev
# Dashboard at http://localhost:3457 (API is proxied automatically)

# Create an API key to log in to the dashboard
node apps/cli/dist/index.js auth create-key --role admin
# Save the printed key — it won't be shown again

# Set your AI provider key
node apps/cli/dist/index.js config set ai.api_key sk-ant-xxxxx

# Create your first agent
node apps/cli/dist/index.js watch "Check Hacker News every hour for AI-related posts"
```

> **Tip:** To use the `omni` shorthand, link the CLI globally:
> ```bash
> cd apps/cli && pnpm link --global
> ```

## Features

### Core Agent System
- **Prompt-to-Agent** -- Describe a task in natural language, get a running background agent
- **Three Agent Types** -- Watcher (monitor), Doer (execute), Auto (autonomous judgment)
- **Self-Healing** -- Agents that crash are automatically diagnosed and repaired by AI
- **Smart Throttle** -- Severity-based notification frequency control
- **Multi-Channel Alerts** -- Slack, Discord, Telegram, Webhook, System notifications
- **Agent Templates** -- Pre-built templates for web monitoring, API checks, RSS feeds
- **AST Code Validation** -- Security-first static analysis before deployment

### Agent Mesh (v0.5)
- **Event Bus** -- Pub/sub inter-agent communication via topics
- **Spawn Chain** -- Agents can spawn child agents with depth limits
- **Time Travel** -- State snapshots with capture and restore
- **MCP Server** -- Model Context Protocol integration (7 tools, 3 resources)
- **Local Brain** -- Ollama integration for offline AI
- **Glass Box** -- Agent introspection and live code editing
- **Recipes** -- Pre-built agent templates with one-click install

### Enterprise (v0.6)
- **Agent Sandbox** -- VM-based isolation (strict/standard/permissive) with isolated-vm
- **Persistent Queue** -- SQLite-backed at-least-once delivery with DLQ and backpressure
- **Multi-Tenant** -- API key auth, RBAC (admin/operator/viewer), tenant isolation
- **Analytics** -- Metrics collector, hourly/daily rollup, Z-score anomaly detection, alert rules

### Platform (v0.7-v0.9)
- **OAuth/OIDC** -- GitHub and Google login with CSRF protection
- **Agent Marketplace** -- Community recipe sharing, discovery, and install
- **OpenAPI Docs** -- Swagger UI at `/api/docs` with full endpoint documentation
- **Real-time WebSocket** -- Live agent status updates with heartbeat and auto-reconnect
- **Success Toasts** -- Instant feedback on agent lifecycle actions

### Unified Architecture (v2.0-v2.2)
- **Single Process** -- Daemon engine embedded in API server, eliminating IPC overhead
- **Direct Function Calls** -- No more Unix Socket RPC; all engine calls are in-process
- **CLI HTTP API** -- CLI communicates via HTTP (no daemon spawn, no Unix Socket)

### Package Consolidation (v4.0)
- **Single Package** -- Daemon engine merged into API server package (`apps/api/src/engine/`)
- **Zero IPC** -- All engine calls are direct function imports, no separate daemon process
- **Simplified Build** -- 5 packages (was 6), single tsup config with multiple entry points

### Quality & Security (v3.0+)
- **Test Suite** -- 554 tests across 60 files (432 root + 122 web)
- **Query Optimization** -- Zero SELECT * in production code; all queries use explicit columns
- **Input Validation** -- Zod schemas on all API routes via @hono/zod-validator
- **Error Handling** -- try-catch on all async route handlers with structured JSON errors
- **Security Hardening** -- Tenant isolation on bulk ops, SSRF prevention, webhook masking
- **Dashboard Tests** -- All 15 pages covered with render tests

## Architecture

```
[Terminal]                              [Browser]
    |                                       |
    v                                       v
[CLI: omni] --------HTTP---------> [Unified API Server (Hono + Engine)]
                                       |              |
                                       |--fork--> [Agent A] (sandbox)
                                       |--fork--> [Agent B] (sandbox)
                                       |--fork--> [Agent N] (sandbox)
                                       v
                                 [SQLite DB (WAL)]
                                 |-- 19 tables
                                 +-- versioned migrations (v001-v007)

                          [Next.js Dashboard] --API proxy--> [API Server]
```

| Layer | Role |
|-------|------|
| **CLI** (`omni`) | Lightweight HTTP client. 15 commands + Ink TUI. Talks to API via HTTP. |
| **API Server** (`apps/api`) | Unified Hono server (70+ endpoints) + embedded daemon engine + WebSocket + MCP. |
| **Engine** (`apps/api/src/engine`) | Agent lifecycle, health, AI, sandbox, queue, metrics — embedded in API package. |
| **Web** (`apps/web`) | Next.js 15 Glass Console. 15 pages with auth, charts, admin. |
| **Agent** | Sandboxed Node.js process with SDK (`omni.fetch`, `omni.notify`, `omni.store`). |

## Web Dashboard

The Glass Console dashboard (port 3457) provides full control over the platform.

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/` | Agent status grid, system metrics, real-time WebSocket updates |
| Agent List | `/agents` | Paginated, filterable table with bulk actions and status badges |
| Agent Detail | `/agents/[id]` | Logs, metrics, snapshots, chat, code editor, spawn chain |
| Create Agent | `/agents/new` | Natural language prompt input with AI-powered code preview |
| Mesh | `/mesh` | Agent event bus topology, subscriptions, paginated event stream |
| Analytics | `/analytics` | Metric charts, anomaly detection, alert rules CRUD |
| Queue | `/queue` | Message queue stats, paginated dead letter management |
| Marketplace | `/marketplace` | Community recipe discovery, install, and publish |
| Recipes | `/recipes` | Built-in agent templates |
| Usage | `/usage` | AI token usage and cost tracking |
| Notifications | `/notifications` | Paginated, filterable notification history |
| Tenants | `/tenants` | Multi-tenant and user management (admin only) |
| Settings | `/settings` | AI, notification, and agent configuration |
| Help | `/help` | Getting started guide, FAQ, keyboard shortcuts |
| Login | `/login` | API key authentication with session management |

## API

- **REST API**: 70+ endpoints with Zod validation and RBAC authorization
- **WebSocket**: Real-time agent status updates with heartbeat ping/pong
- **MCP Server**: 7 tools and 3 resources for AI integration (Streamable HTTP)
- **OpenAPI**: Swagger UI at `/api/docs` with full endpoint documentation

### Authentication

```bash
# API key header
curl -H "X-API-Key: omni_..." http://localhost:3456/api/agents

# OAuth Bearer token
curl -H "Authorization: Bearer <token>" http://localhost:3456/api/agents
```

### Key Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/agents` | viewer+ | List agents |
| POST | `/api/agents` | operator+ | Create agent |
| DELETE | `/api/agents/:id` | operator+ | Destroy agent |
| POST | `/api/agents/:id/start` | operator+ | Start agent |
| POST | `/api/agents/:id/stop` | operator+ | Stop agent |
| POST | `/api/agents/:id/restart` | operator+ | Restart agent |
| POST | `/api/agents/bulk` | operator+ | Bulk start/stop/restart/destroy |
| GET | `/api/agents/:id/logs` | viewer+ | Agent logs |
| GET | `/api/agents/:id/metrics` | viewer+ | Agent metrics |
| GET | `/api/agents/:id/snapshots` | viewer+ | Time travel snapshots |
| POST | `/api/agents/:id/chat` | operator+ | Chat with agent |
| POST | `/api/agents/preview` | operator+ | AI code preview |
| POST | `/api/agents/:id/apply` | operator+ | Apply previewed code |
| POST | `/api/auth/login` | -- | API key login |
| GET | `/api/auth/me` | token | Current user info |
| POST | `/api/auth/logout` | token | Logout session |
| GET | `/api/auth/github` | -- | GitHub OAuth start |
| GET | `/api/auth/google` | -- | Google OAuth start |
| GET | `/api/mesh/events` | viewer+ | Mesh events |
| GET | `/api/mesh/topology` | viewer+ | Agent mesh topology |
| GET | `/api/analytics/metrics` | viewer+ | Metric rollups |
| GET | `/api/analytics/anomalies` | viewer+ | Anomaly detection |
| CRUD | `/api/analytics/alerts` | operator+ | Alert rules |
| GET | `/api/security/events` | admin | Security audit log |
| GET | `/api/queue/stats` | viewer+ | Queue statistics |
| GET | `/api/queue/dead-letters` | operator+ | Dead letter queue |
| GET | `/api/marketplace` | viewer+ | Browse recipes |
| POST | `/api/marketplace` | operator+ | Publish recipe |
| POST | `/api/marketplace/:id/install` | operator+ | Install recipe |
| DELETE | `/api/marketplace/:id` | admin | Remove recipe |
| CRUD | `/api/tenants` | admin | Tenant management |
| CRUD | `/api/users` | admin | User management |
| POST | `/api/users/:id/rotate-key` | admin | Rotate user API key |
| GET | `/api/system/status` | -- | System health |
| GET | `/api/system/health/detailed` | -- | Detailed health check |
| GET | `/api/system/ollama` | -- | Ollama status |
| POST | `/api/mcp` | -- | MCP Streamable HTTP |
| GET | `/api/docs` | -- | OpenAPI Swagger UI |
| WS | `/ws` | -- | Real-time events |

## Security

- **API key authentication** -- `omni_` prefix + 32 hex chars, SHA-256 hashed storage
- **OAuth/OIDC** -- GitHub and Google login with CSRF state protection
- **RBAC** -- Role-based access control: `admin` > `operator` > `viewer`
- **Agent Sandbox** -- VM-based isolation with three security levels
- **SQL injection prevention** -- Parameterized queries throughout
- **Security audit log** -- All sandbox violations recorded in DB

### Sandbox Levels

| Level | Memory | Timeout | FS Access | Network |
|-------|--------|---------|-----------|---------|
| **Strict** | 64 MB | 10s | None | Allowlist only |
| **Standard** | 128 MB | 30s | Agent dir | All HTTPS |
| **Permissive** | 256 MB | 60s | Agent dir + tmp | All |

### Code Validation
- Forbidden imports: `child_process`, `cluster`, `net`, `vm`, `worker_threads`
- Blocked patterns: `eval()`, `new Function()`, `process.exit()`
- AST-level static analysis before deployment
- isolated-vm V8 isolate for strict sandbox

## Development

```bash
# Install dependencies
pnpm install

# Build all packages (Turborepo)
npx turbo build

# Dev mode (watch)
npx turbo dev

# Run all tests (554 tests, 60 files)
npx turbo test

# Type check
pnpm lint
```

## CI/CD

GitHub Actions workflow runs on every push and PR to `main`:

1. Checkout + pnpm setup
2. `pnpm install --frozen-lockfile`
3. `npx turbo build` (all 5 packages)
4. `npx vitest run` (full test suite)

## Database

- **Engine**: SQLite with WAL mode (better-sqlite3)
- **Tables**: 19 application tables + 1 migrations table
- **Migrations**: 7 versioned migration files (v001-v007)
- **Key tables**: agents, agent_logs, agent_metrics, agent_store, agent_chat_messages, notifications, ai_usage, mesh_events, mesh_subscriptions, agent_snapshots, security_events, message_queue, dead_letters, tenants, users, metric_rollups, alert_rules, marketplace_recipes, oauth_sessions

## Project Structure

```
omniwatch/
+-- apps/
|   +-- cli/                    # CLI client (15 commands + Ink TUI)
|   +-- api/                    # Unified API server (Hono + Engine)
|   |   +-- src/routes/         # 15 route groups
|   |   +-- src/engine/         # Daemon engine (lifecycle, handlers, agent runtime)
|   |   +-- src/middleware/     # auth, error-handler, logger
|   |   +-- src/openapi.ts      # OpenAPI/Swagger
|   |   +-- src/ws.ts           # WebSocket server
|   +-- web/                    # Next.js 15 Dashboard
|       +-- src/app/            # 15 pages (Glass Console)
|       +-- src/components/     # Pagination, AuthGuard, ToastContainer
|       +-- src/lib/            # auth-store, toast-store, api wrapper
+-- packages/
|   +-- shared/                 # Types, constants, errors, IPC, auth
|   +-- db/                     # SQLite schema + versioned migrations
|       +-- src/migrations/     # v001-v007
+-- tests/                      # 60 files, 554 tests
+-- bin/omni.mjs                # CLI entry point
+-- Dockerfile                  # Production container
+-- docker-compose.yml          # Docker Compose config
+-- turbo.json                  # Turborepo config
+-- pnpm-workspace.yaml         # Workspace definition
```

## Tech Stack

| Area | Technology |
|------|-----------|
| Language | TypeScript 5.x + Node.js 20 |
| Monorepo | Turborepo + pnpm workspace |
| CLI | Commander.js |
| TUI | Ink (React for Terminal) |
| API | Hono + @hono/zod-validator |
| Web | Next.js 15 + Tailwind v4 + recharts |
| AI | Anthropic SDK + Ollama |
| Database | SQLite (better-sqlite3, WAL mode) |
| Sandbox | node:vm + isolated-vm |
| Auth | API Key + OAuth (GitHub/Google) |
| MCP | @modelcontextprotocol/sdk |
| IPC | HTTP API (CLI → API) + direct function calls (engine in-process since v2.0) |
| Build | tsup (esbuild) + next build |
| Test | Vitest |
| CI/CD | GitHub Actions |
| Container | Docker + Docker Compose |

## License

MIT
