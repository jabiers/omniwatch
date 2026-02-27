# OmniWatch v0.4 Design Document

## 1. Monorepo Structure

```
omniwatch/
├── apps/
│   ├── cli/                    # CLI client
│   │   ├── src/
│   │   │   ├── commands/       # 14 command handlers
│   │   │   ├── ui/             # Ink TUI components
│   │   │   ├── index.ts        # Commander entry
│   │   │   └── ipc-client.ts   # Unix socket client
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── daemon/                 # Background daemon + agent
│   │   ├── src/
│   │   │   ├── handlers/       # RPC handlers
│   │   │   ├── notification-channels/
│   │   │   ├── agent/          # Agent runtime + SDK + templates
│   │   │   ├── agent-manager.ts
│   │   │   ├── code-generator.ts
│   │   │   ├── code-validator.ts
│   │   │   ├── self-healer.ts
│   │   │   ├── health-monitor.ts
│   │   │   ├── smart-throttle.ts
│   │   │   ├── scheduler.ts
│   │   │   ├── notifier.ts
│   │   │   ├── chat-handler.ts
│   │   │   ├── dependency-installer.ts
│   │   │   ├── rpc-server.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── api/                    # NEW: Hono REST API
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── agents.ts
│   │   │   │   ├── notifications.ts
│   │   │   │   └── system.ts
│   │   │   ├── middleware/
│   │   │   │   ├── error-handler.ts
│   │   │   │   └── logger.ts
│   │   │   ├── ws.ts           # WebSocket handler
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                    # NEW: Next.js Dashboard
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   ├── agents/
│       │   │   ├── notifications/
│       │   │   └── settings/
│       │   ├── components/
│       │   ├── lib/
│       │   └── hooks/
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── shared/                 # Types, constants, errors
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   ├── constants.ts
│   │   │   ├── errors.ts
│   │   │   ├── ipc-protocol.ts
│   │   │   ├── logger.ts
│   │   │   └── index.ts        # Re-export all
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── db/                     # SQLite schema + config
│       ├── src/
│       │   ├── db.ts
│       │   ├── config.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── bin/omni.mjs
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

## 2. Package Dependencies

```
packages/shared ← no deps
packages/db ← shared
apps/cli ← shared, db
apps/daemon ← shared, db
apps/api ← shared, db
apps/web ← shared (types only)
```

## 3. Import Migration

Before:
```typescript
import { SOCKET_PATH } from '../shared/constants.js';
import { getDb } from '../shared/db.js';
```

After:
```typescript
import { SOCKET_PATH } from '@omniwatch/shared';
import { getDb } from '@omniwatch/db';
```

## 4. API Server Design (Hono)

### Endpoints
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /api/agents | list | Agent list |
| GET | /api/agents/:id | get | Agent detail |
| POST | /api/agents | create | Create agent |
| DELETE | /api/agents/:id | destroy | Delete agent |
| POST | /api/agents/:id/start | start | Start agent |
| POST | /api/agents/:id/stop | stop | Stop agent |
| POST | /api/agents/:id/restart | restart | Restart agent |
| GET | /api/agents/:id/logs | logs | Agent logs |
| GET | /api/notifications | list | Notification history |
| GET | /api/system/status | status | System status |
| WS | /ws | stream | Real-time events |

### API directly reads SQLite DB (daemon shares DB file).
No IPC proxy needed — simpler, faster, no daemon dependency for reads.
Writes that need daemon (start/stop/create) → use IPC bridge.

## 5. Web Dashboard Design (Next.js 15)

### Glass Console Theme
- Background: `#0a0a0f` with subtle glass panels
- Accent: Emerald green (`#10b981`)
- Cards: `bg-white/5 backdrop-blur border-white/10`
- Font: `font-mono` for data, `font-sans` for UI

### Pages
1. **Dashboard Home** `/` — Agent status grid, system metrics, recent notifications
2. **Agent List** `/agents` — Filterable table, status badges, quick actions
3. **Agent Detail** `/agents/[id]` — Logs, metrics chart, start/stop/restart controls
4. **Create Agent** `/agents/new` — Natural language prompt input, preview, deploy
5. **Notifications** `/notifications` — Filterable notification history
6. **Settings** `/settings` — Config editor (AI key, notification channels)

## 6. Build Configuration

### turbo.json
```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "dependsOn": ["^build"], "persistent": true },
    "test": { "dependsOn": ["^build"] },
    "lint": { "dependsOn": ["^build"] }
  }
}
```

### Package build tools
- packages/shared: tsup → dist/
- packages/db: tsup → dist/
- apps/cli: tsup → dist/
- apps/daemon: tsup → dist/ (3 entry points: daemon, agent runtime)
- apps/api: tsup → dist/
- apps/web: next build → .next/
