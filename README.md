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
- **Self-Healing** — Agents that crash are automatically diagnosed and repaired by AI
- **TUI Dashboard** — Real-time monitoring with `omni dash`
- **Interactive Chat** — Modify agents conversationally with `omni chat`
- **Multi-Channel Alerts** — Slack, Discord, Telegram, Webhook, System notifications
- **Agent Templates** — Pre-built templates for common tasks (web monitoring, API checks, RSS feeds)
- **AST Code Validation** — Security-first code analysis before deployment

## Architecture

```
[Terminal]
    │
    ▼
[CLI: omni] ──Unix Socket──▶ [Daemon: omnid] ──fork──▶ [Agent A]
                                    │                    [Agent B]
                                    │                    [Agent N]
                                    ▼
                              [SQLite DB]
```

| Layer | Role |
|-------|------|
| **CLI** (`omni`) | Lightweight client. Sends commands and exits. |
| **Daemon** (`omnid`) | Background service. Manages agent lifecycle, health checks, AI calls, notifications. |
| **Agent** | Independent Node.js process with sandboxed SDK (`omni.fetch`, `omni.notify`, `omni.store`). |

## Requirements

- Node.js >= 20.0.0
- Anthropic API key (Claude)

## Installation

```bash
# From source
git clone https://github.com/your-username/omniwatch.git
cd omniwatch
npm install
npm run build

# Link globally
npm link

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

# 5. Open the dashboard
omni dash
```

## Commands

| Command | Description |
|---------|-------------|
| `omni watch <prompt>` | Create a watcher agent from natural language |
| `omni list` | List all agents with status |
| `omni logs <id>` | View agent logs |
| `omni start <id>` | Start a stopped agent |
| `omni stop <id>` | Stop a running agent |
| `omni restart <id>` | Restart an agent |
| `omni destroy <id>` | Permanently remove an agent |
| `omni status <id>` | Show detailed agent status |
| `omni dash` | Launch TUI dashboard |
| `omni chat <id>` | Interactive chat to modify an agent |
| `omni config get/set` | Manage configuration |
| `omni daemon start/stop` | Control the background daemon |

## Dashboard

The TUI dashboard (`omni dash`) provides real-time monitoring:

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

## Notifications

Configure notification channels in `~/.omniwatch/config.json`:

```jsonc
{
  "notification": {
    "system": true,                          // macOS system notifications
    "webhook_url": "https://...",            // Generic webhook
    "slack_webhook": "https://hooks.slack.com/...",
    "discord_webhook": "https://discord.com/api/webhooks/...",
    "telegram_token": "bot123:ABC...",
    "telegram_chat_id": "123456789",
    "channels": {
      "slack":    { "min_severity": "warning"  },
      "discord":  { "min_severity": "critical" },
      "telegram": { "min_severity": "info"     }
    }
  }
}
```

## Agent SDK

Agents have access to a sandboxed SDK:

```typescript
// Available inside agent code
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
}
```

## Security

Agent code is validated through AST analysis before execution:

- **Forbidden imports**: `fs`, `child_process`, `net`, `vm`, `worker_threads`
- **Blocked patterns**: `eval()`, `new Function()`, `process.exit()`, `require()`
- **Whitelisted packages**: `axios`, `cheerio`, `dayjs`, `lodash`, `node-fetch`, `rss-parser`, etc.
- **Resource limits**: 128MB memory per agent, max 20 concurrent agents

## Development

```bash
# Run CLI in dev mode
npm run dev

# Run daemon in dev mode
npm run dev:daemon

# Run tests
npm test

# Type check
npm run lint

# Build
npm run build
```

## Project Structure

```
src/
├── cli/                 # CLI client
│   ├── commands/        # Command handlers (watch, list, dash, chat, ...)
│   ├── ui/              # Ink TUI components (Dashboard, AgentTable, LogViewer)
│   └── ipc-client.ts    # Daemon communication
├── daemon/              # Background service
│   ├── agent-manager.ts # Agent lifecycle management
│   ├── rpc-server.ts    # Unix socket RPC server
│   ├── code-generator.ts# AI code generation
│   ├── code-validator.ts# AST-based security validation
│   ├── chat-handler.ts  # Interactive agent modification
│   ├── health-monitor.ts# Heartbeat monitoring
│   ├── self-healer.ts   # Auto-repair on failure
│   ├── scheduler.ts     # Cron scheduling
│   ├── notification-channels/  # Slack, Discord, Telegram, Webhook, System
│   └── handlers/        # RPC method handlers
├── agent/               # Agent runtime
│   ├── runtime.ts       # Execution sandbox
│   ├── sdk.ts           # omni.fetch, omni.notify, omni.store, omni.log
│   └── templates/       # Pre-built agent templates
└── shared/              # Shared utilities
    ├── types.ts         # TypeScript interfaces
    ├── config.ts        # Configuration management
    ├── db.ts            # SQLite + Drizzle ORM
    ├── constants.ts     # Paths, limits, whitelists
    └── ipc-protocol.ts  # Message serialization
```

## Tech Stack

| Area | Technology |
|------|-----------|
| Language | TypeScript 5.x + Node.js 20 |
| CLI | Commander.js |
| TUI | Ink (React for Terminal) |
| AI | @anthropic-ai/sdk (Claude) |
| Database | SQLite (better-sqlite3) |
| IPC | Unix Domain Socket |
| Build | tsup (esbuild) |
| Test | Vitest |

## License

MIT
