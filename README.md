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

- **Prompt-to-Agent** — Describe a task in natural language, get a running background agent
- **Three Agent Types** — Watcher (monitor), Doer (execute), Auto (autonomous judgment)
- **Self-Healing** — Agents that crash are automatically diagnosed and repaired by AI
- **Smart Throttle** — Severity-based notification frequency control
- **TUI Dashboard** — Real-time terminal monitoring with `omni dash`
- **Web Dashboard** — Glass Console browser UI (Next.js 15)
- **REST API** — Hono-based API with WebSocket real-time streaming
- **Interactive Chat** — Modify agents conversationally with `omni chat`
- **Multi-Channel Alerts** — Slack, Discord, Telegram, Webhook, System notifications
- **Agent Templates** — Pre-built templates for web monitoring, API checks, RSS feeds
- **AST Code Validation** — Security-first code analysis before deployment

## Architecture

```
[Terminal]                              [Browser]
    │                                       │
    ▼                                       ▼
[CLI: omni] ──Unix Socket──▶ [Daemon] ◀── [API: Hono]
                                │              │
                                ├──fork──▶ [Agent A]
                                ├──fork──▶ [Agent B]
                                ├──fork──▶ [Agent N]
                                ▼
                          [SQLite DB] ◀── [Web: Next.js]
```

| Layer | Role |
|-------|------|
| **CLI** (`omni`) | Lightweight terminal client. Sends commands and exits. |
| **Daemon** (`omnid`) | Background service. Manages agent lifecycle, health checks, AI calls, notifications. |
| **API** (`apps/api`) | REST API + WebSocket. Reads SQLite directly, proxies writes to daemon via IPC. |
| **Web** (`apps/web`) | Next.js 15 Glass Console dashboard. Real-time agent monitoring in the browser. |
| **Agent** | Independent Node.js process with sandboxed SDK (`omni.fetch`, `omni.notify`, `omni.store`). |

## Requirements

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Anthropic API key (Claude)

## Installation

```bash
git clone https://github.com/your-username/omniwatch.git
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
| `omni stop <id>` | Stop a running agent |
| `omni restart <id>` | Restart an agent |
| `omni destroy <id>` | Permanently remove an agent |

### Interactive & UI

| Command | Description |
|---------|-------------|
| `omni dash` | Launch TUI dashboard |
| `omni chat <id>` | Interactive chat to modify an agent |
| `omni config get/set` | Manage configuration |
| `omni daemon start/stop` | Control the background daemon |

## Web Dashboard

The Glass Console web dashboard provides browser-based monitoring.

```bash
# Start the API server
cd apps/api && pnpm dev    # http://localhost:3456

# Start the web dashboard
cd apps/web && pnpm dev    # http://localhost:3457
```

### Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/` | Agent status grid, system metrics, recent notifications |
| Agent List | `/agents` | Filterable table with status badges and quick actions |
| Agent Detail | `/agents/[id]` | Logs, metrics, start/stop/restart controls |
| Create Agent | `/agents/new` | Natural language prompt input with type selection |
| Notifications | `/notifications` | Filterable notification history |
| Settings | `/settings` | API key, model, notification channel configuration |

## TUI Dashboard

The terminal dashboard (`omni dash`) provides real-time monitoring:

```
┌─ OmniWatch Dashboard ─────────────────────────────┐
│ Agents: 3 running  │  Errors: 0  │  Uptime: 2h    │
├────────────────────────────────────────────────────┤
│ ● amazon-airpods      running    30s ago           │
│   btc-price-alert     running    10s ago           │
│   hackernews-ai       running    2m ago            │
├────────────────────────────────────────────────────┤
│ [Log Viewer]                                       │
│ 14:02:31 [amazon-airpods] Price check: $279        │
│ 14:02:28 [btc-price-alert] BTC: $67,432            │
└────────────────────────────────────────────────────┘
```

**Keyboard shortcuts:** `q` quit, `r` refresh, `j/k` navigate, `s` start, `x` stop, `d` destroy

## REST API

The Hono API server runs on port 3456.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | List agents (filter: `?status=running`) |
| GET | `/api/agents/:id` | Agent detail |
| POST | `/api/agents` | Create agent |
| DELETE | `/api/agents/:id` | Delete agent |
| POST | `/api/agents/:id/start` | Start agent |
| POST | `/api/agents/:id/stop` | Stop agent |
| POST | `/api/agents/:id/restart` | Restart agent |
| GET | `/api/agents/:id/logs` | Agent logs (filter: `?level=error`) |
| GET | `/api/agents/:id/metrics` | Agent metrics |
| GET | `/api/notifications` | Notification history |
| GET | `/api/system/status` | System status |
| WS | `/ws` | Real-time event stream |
| GET | `/health` | Health check |

## Notifications

Configure notification channels:

```bash
omni config set notification.system true
omni config set notification.slack_webhook "https://hooks.slack.com/..."
omni config set notification.discord_webhook "https://discord.com/api/webhooks/..."
omni config set notification.telegram_token "bot123:ABC..."
omni config set notification.telegram_chat_id "123456789"
```

Smart Throttle prevents notification flooding:

| Severity | Throttle Window |
|----------|----------------|
| Critical | No throttle (always delivered) |
| Warning | 5 minutes |
| Info | 15 minutes |

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

  // Utilities
  await omni.sleep(1000);
  const result = await omni.retry(() => fetchData(), { maxRetries: 3 });
  const res = await omni.timeout(fetchData(), 5000);
}
```

## Security

Agent code is validated through AST analysis before execution:

- **Forbidden imports**: `fs`, `child_process`, `net`, `vm`, `worker_threads`
- **Blocked patterns**: `eval()`, `new Function()`, `process.exit()`, `require()`
- **Loop guards**: Infinite loop and deep recursion detection
- **Whitelisted packages**: `axios`, `cheerio`, `dayjs`, `lodash`, `node-fetch`, `rss-parser`, etc.
- **Resource limits**: 128MB memory per agent, max 20 concurrent agents

## Development

```bash
# Build all packages
pnpm build

# Run all tests
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
│   ├── cli/                    # CLI client
│   │   ├── src/commands/       # 14 command handlers
│   │   └── src/ui/             # Ink TUI components
│   ├── daemon/                 # Background daemon
│   │   ├── src/handlers/       # RPC method handlers
│   │   ├── src/notification-channels/
│   │   └── src/agent/          # Agent runtime + SDK + templates
│   ├── api/                    # Hono REST API
│   │   ├── src/routes/         # agents, notifications, system
│   │   ├── src/middleware/      # error-handler, logger
│   │   └── src/ws.ts           # WebSocket handler
│   └── web/                    # Next.js 15 Dashboard
│       └── src/app/            # Glass Console pages
├── packages/
│   ├── shared/                 # Types, constants, errors, IPC, logger
│   └── db/                     # SQLite schema, config management
├── tests/                      # 18 files, 114 tests
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
| API | Hono + WebSocket |
| Web | Next.js 15 + Tailwind v4 |
| AI | @anthropic-ai/sdk (Claude) |
| Database | SQLite (better-sqlite3) |
| IPC | Unix Domain Socket (JSON-RPC 2.0) |
| Build | tsup (esbuild) + next build |
| Test | Vitest |

## License

MIT
