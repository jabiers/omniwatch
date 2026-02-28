# OmniWatch

> **Don't Config, Just Speak** — AI-native CLI tool for autonomous agent management.

OmniWatch is a terminal-native platform where you describe what you want in plain language, and AI automatically generates, runs, monitors, and self-heals background agents 24/7.

```
$ omni watch "Alert me when AirPods Pro drops below $250 on Amazon"
Agent [amazon-airpods] created and running.

$ omni list
ID              NAME                STATUS    LAST CHECK
agent-a1b2      amazon-airpods      running   30s ago
agent-c3d4      btc-price-alert     running   10s ago
agent-e5f6      hackernews-ai       running   2m ago
```

## Features

### Core
- **Prompt-to-Agent** — Describe a task in natural language, get a running background agent
- **Three Agent Types** — Watcher (monitor), Doer (execute), Auto (autonomous judgment)
- **Self-Healing** — Agents that crash are automatically diagnosed and repaired by AI
- **Smart Throttle** — Severity-based notification frequency control
- **Multi-Channel Alerts** — Slack, Discord, Telegram, Webhook, System notifications
- **Agent Templates** — Pre-built templates for web monitoring, API checks, RSS feeds
- **AST Code Validation** — Security-first code analysis before deployment

### Agent Mesh (v0.5)
- **Event Bus** — Pub/sub inter-agent communication via topics
- **Spawn Chain** — Agents can spawn child agents with depth limits
- **Time Travel** — State snapshots with capture/restore
- **MCP Server** — Model Context Protocol integration (7 tools, 3 resources)
- **Local Brain** — Ollama integration for offline AI
- **Glass Box** — Agent introspection and live code editing
- **Recipes** — Pre-built agent templates with one-click install

### Enterprise (v0.6)
- **Agent Sandbox** — VM-based isolation (strict/standard/permissive) + isolated-vm
- **Persistent Queue** — SQLite-backed at-least-once delivery with DLQ
- **Multi-Tenant** — API key auth, RBAC (admin/operator/viewer), tenant isolation
- **Analytics** — Metrics collector, hourly/daily rollup, Z-score anomaly detection, alert rules
- **Security Audit** — Event logging for sandbox violations

### Platform (v0.7)
- **OAuth/OIDC** — GitHub and Google login support
- **Agent Marketplace** — Community recipe sharing and discovery
- **Web Login** — API key authentication with session management

## Architecture

```
[Terminal]                              [Browser]
    │                                       │
    ▼                                       ▼
[CLI: omni] ──Unix Socket──▶ [Daemon] ◀── [Next.js + Hono API]
                                │              │
                                ├──fork──▶ [Agent A] (sandbox)
                                ├──fork──▶ [Agent B] (sandbox)
                                ├──fork──▶ [Agent N] (sandbox)
                                ▼
                          [SQLite DB (WAL)]
                          ├─ 17 tables
                          └─ versioned migrations
```

| Layer | Role |
|-------|------|
| **CLI** (`omni`) | Lightweight terminal client. 14 commands + Ink TUI. |
| **Daemon** (`omnid`) | Background service. Agent lifecycle, health, AI, sandbox, queue, metrics. |
| **API** (`apps/api`) | Hono REST API (40+ endpoints) + WebSocket + MCP. Embedded in Next.js or standalone. |
| **Web** (`apps/web`) | Next.js 15 Glass Console. 13 pages with auth, charts, admin. |
| **Agent** | Sandboxed Node.js process with SDK (`omni.fetch`, `omni.notify`, `omni.store`). |

## Requirements

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Anthropic API key (Claude) — or Ollama for local AI

## Installation

```bash
git clone https://github.com/jabiers/omniwatch.git
cd omniwatch
pnpm install
pnpm build

# Link globally
pnpm link --global

# Set your API key
omni config set ai.api_key sk-ant-xxxxx
```

## Quick Start

```bash
# 1. Start the daemon
omni daemon start

# 2. Create your first agent
omni watch "Check Hacker News every hour for AI-related posts and notify me"

# 3. View running agents
omni list

# 4. Check logs
omni logs <agent-id>

# 5. Open the TUI dashboard
omni dash

# 6. Open the web dashboard
cd apps/web && pnpm dev    # http://localhost:3457
```

## Commands

### Agent Creation

| Command | Description |
|---------|-------------|
| `omni watch <prompt>` | Create a **watcher** agent — monitors conditions and alerts |
| `omni do <prompt>` | Create a **doer** agent — executes periodic or one-shot tasks |
| `omni do --once <prompt>` | Run a one-shot task and exit |
| `omni do --schedule "0 9 * * *" <prompt>` | Schedule with cron expression |
| `omni auto <prompt>` | Create an **auto** agent — autonomous judgment and action |

### Agent Management

| Command | Description |
|---------|-------------|
| `omni list` | List all agents with status |
| `omni status <id>` | Show detailed agent status |
| `omni logs <id>` | View agent logs |
| `omni start <id>` | Start a stopped agent |
| `omni stop <id>` | Restart an agent |
| `omni destroy <id>` | Permanently remove an agent |
| `omni chat <id>` | Interactive chat to modify an agent |
| `omni config get/set` | Manage configuration |
| `omni daemon start/stop` | Control the background daemon |

## Web Dashboard

The Glass Console web dashboard runs on port 3457 with embedded API.

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/` | Agent status grid, system metrics, WebSocket real-time |
| Agent List | `/agents` | Filterable table with status badges and quick actions |
| Agent Detail | `/agents/[id]` | Logs, metrics, snapshots, chat, code editor |
| Create Agent | `/agents/new` | Natural language prompt input with AI preview |
| Mesh | `/mesh` | Agent event bus topology |
| Analytics | `/analytics` | Metric charts, anomaly detection, alert rules CRUD |
| Queue | `/queue` | Message queue stats, dead letter management |
| Marketplace | `/marketplace` | Community recipe discovery and install |
| Recipes | `/recipes` | Built-in agent templates |
| Usage | `/usage` | AI token usage and cost tracking |
| Notifications | `/notifications` | Filterable notification history |
| Tenants | `/tenants` | Multi-tenant and user management (admin) |
| Settings | `/settings` | AI, notification, agent configuration |
| Login | `/login` | API key authentication |

## REST API

40+ endpoints with zod validation and RBAC.

### Authentication

```bash
# Use API key header
curl -H "X-API-Key: omni_..." http://localhost:3457/api/agents

# Or Bearer token (OAuth sessions)
curl -H "Authorization: Bearer <token>" http://localhost:3457/api/agents
```

### Core Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/agents` | viewer+ | List agents |
| POST | `/api/agents` | operator+ | Create agent |
| DELETE | `/api/agents/:id` | operator+ | Destroy agent |
| POST | `/api/agents/:id/start` | operator+ | Start agent |
| POST | `/api/agents/:id/stop` | operator+ | Stop agent |
| GET | `/api/agents/:id/logs` | viewer+ | Agent logs |
| GET | `/api/agents/:id/metrics` | viewer+ | Agent metrics |
| GET | `/api/agents/:id/snapshots` | viewer+ | Time travel snapshots |
| POST | `/api/agents/:id/chat` | operator+ | Chat with agent |
| GET | `/api/mesh/events` | viewer+ | Mesh events |
| GET | `/api/analytics/metrics` | viewer+ | Metric rollups |
| GET | `/api/analytics/anomalies` | viewer+ | Anomaly detection |
| GET/POST/PUT/DELETE | `/api/analytics/alerts` | operator+ | Alert rules CRUD |
| GET | `/api/queue/stats` | viewer+ | Queue statistics |
| GET | `/api/marketplace` | viewer+ | Browse recipes |
| POST | `/api/marketplace/:id/install` | operator+ | Install recipe |
| GET/POST | `/api/tenants` | admin | Tenant management |
| GET/POST/DELETE | `/api/users` | admin | User management |
| POST | `/api/mcp` | — | MCP Streamable HTTP |
| GET | `/api/system/status` | — | System status |
| WS | `/ws` | — | Real-time events |

## Agent SDK

Agents have access to a sandboxed SDK:

```typescript
export default async function agent(omni) {
  // HTTP requests
  const data = await omni.fetch('https://api.example.com/data');

  // Persistent key-value storage
  await omni.store.set('last_price', data.price);
  const prev = await omni.store.get('last_price');

  // Send notifications
  omni.notify('Price dropped!', { severity: 'critical' });

  // Structured logging
  omni.log.info('Check completed', { price: data.price });

  // Agent Mesh — publish events
  omni.mesh.publish('price:updated', { price: data.price });

  // Spawn child agents
  const childId = await omni.spawn('Monitor sub-page', { maxDepth: 2 });

  // Time travel — capture state
  await omni.snapshot('before-update');
}
```

## Security

### Agent Sandbox Levels

| Level | Memory | Timeout | FS Access | Network |
|-------|--------|---------|-----------|---------|
| **Strict** | 64 MB | 10s | None | Allowlist only |
| **Standard** | 128 MB | 30s | Agent dir | All HTTPS |
| **Permissive** | 256 MB | 60s | Agent dir + tmp | All |

### Code Validation
- **Forbidden imports**: `child_process`, `cluster`, `net`, `vm`, `worker_threads`
- **Blocked patterns**: `eval()`, `new Function()`, `process.exit()`
- **AST analysis**: Static code analysis before deployment
- **isolated-vm**: V8 isolate for strict sandbox level
- **Security audit log**: All violations recorded in DB

### Authentication & RBAC
- API key authentication (`omni_` + 32 hex chars, SHA-256 hashed)
- Role-based access: `admin` > `operator` > `viewer`
- Multi-tenant isolation with per-tenant agent filtering
- OAuth/OIDC support (GitHub, Google)

## Development

```bash
# Build all packages (6 packages via Turborepo)
pnpm build

# Run all tests (280+ tests, 32 files)
pnpm test

# Dev mode (watch)
pnpm dev

# Type check
pnpm lint
```

## Project Structure

```
omniwatch/
├── apps/
│   ├── cli/                    # CLI client (14 commands + Ink TUI)
│   ├── daemon/                 # Background daemon
│   │   ├── src/handlers/       # 7 RPC handler groups
│   │   ├── src/agent/          # Agent runtime + SDK
│   │   ├── src/sandbox.ts      # VM isolation + isolated-vm
│   │   ├── src/message-queue.ts # Persistent queue
│   │   ├── src/metrics-collector.ts
│   │   └── src/anomaly-detector.ts
│   ├── api/                    # Hono REST API
│   │   ├── src/routes/         # 14 route groups
│   │   ├── src/middleware/     # auth, error-handler, logger
│   │   └── src/app.ts          # Hono app factory
│   └── web/                    # Next.js 15 Dashboard
│       ├── src/app/            # 13 pages (Glass Console)
│       ├── src/components/     # AuthGuard
│       └── src/lib/            # auth-store (zustand)
├── packages/
│   ├── shared/                 # Types, constants, errors, IPC, auth
│   └── db/                     # SQLite schema + versioned migrations
│       └── src/migrations/     # v001-v005
├── tests/                      # 32 files, 280+ tests
├── bin/omni.mjs                # CLI entry point
├── turbo.json                  # Turborepo config
└── pnpm-workspace.yaml         # Workspace definition
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
| IPC | Unix Domain Socket (JSON-RPC 2.0) |
| Build | tsup (esbuild) + next build |
| Test | Vitest |

## License

MIT
