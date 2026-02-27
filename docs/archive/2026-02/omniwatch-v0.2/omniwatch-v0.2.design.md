# OmniWatch v0.2 Design Document

> **Summary**: TUI Dashboard, 알림 플러그인, 대화형 모드, 코드 품질 개선 상세 설계
>
> **Project**: OmniWatch
> **Version**: 0.2.0
> **Author**: Paul
> **Date**: 2026-02-27
> **Planning Doc**: [omniwatch-v0.2.plan.md](../../01-plan/features/omniwatch-v0.2.plan.md)

---

## 1. Project Structure (v0.2 Changes)

```
src/
├── cli/
│   ├── index.ts                          # MODIFY: register dash, chat commands
│   ├── ipc-client.ts                     # existing
│   ├── commands/
│   │   ├── watch.ts                      # MODIFY: add --preview flag
│   │   ├── dash.ts                       # NEW: TUI dashboard entry
│   │   ├── chat.ts                       # NEW: interactive chat mode
│   │   ├── list.ts                       # existing
│   │   ├── logs.ts                       # existing
│   │   ├── start.ts                      # existing
│   │   ├── stop.ts                       # existing
│   │   ├── restart.ts                    # existing
│   │   ├── destroy.ts                    # existing
│   │   ├── status.ts                     # existing
│   │   ├── config.ts                     # existing
│   │   └── daemon.ts                     # existing
│   └── ui/                               # NEW: Ink TUI components
│       ├── Dashboard.tsx                  # Main dashboard layout
│       ├── AgentTable.tsx                 # Agent list with status
│       ├── LogViewer.tsx                  # Real-time log display
│       ├── StatusBar.tsx                  # System stats header
│       └── ChatInterface.tsx              # Interactive chat UI
│
├── daemon/
│   ├── index.ts                          # existing
│   ├── rpc-server.ts                     # MODIFY: register new RPC methods
│   ├── agent-manager.ts                  # existing
│   ├── code-generator.ts                 # MODIFY: add preview mode
│   ├── code-validator.ts                 # MODIFY: regex → AST (acorn)
│   ├── health-monitor.ts                 # existing
│   ├── self-healer.ts                    # existing
│   ├── scheduler.ts                      # existing
│   ├── dependency-installer.ts           # existing
│   ├── chat-handler.ts                   # NEW: AI chat for agent modification
│   ├── notifier.ts                       # MODIFY: delegate to channel registry
│   ├── notification-channels/            # NEW: plugin system
│   │   ├── types.ts                      # NotificationChannel interface
│   │   ├── registry.ts                   # Channel registry + dispatch
│   │   ├── webhook.ts                    # Generic webhook (extracted)
│   │   ├── slack.ts                      # Slack Incoming Webhook
│   │   ├── discord.ts                    # Discord Webhook (embed)
│   │   ├── telegram.ts                   # Telegram Bot API
│   │   └── system.ts                     # macOS osascript (extracted)
│   └── handlers/
│       ├── agent.ts                      # MODIFY: add preview handler
│       ├── chat.ts                       # NEW: chat RPC handler
│       ├── log.ts                        # existing
│       └── system.ts                     # existing
│
├── agent/
│   ├── runtime.ts                        # existing
│   ├── sdk.ts                            # existing
│   └── templates/                        # NEW: preset templates
│       ├── base-prompt.ts                # System prompt (extracted from code-generator)
│       ├── web-monitor.ts                # Website change detection
│       ├── api-checker.ts                # API endpoint health check
│       └── rss-watcher.ts                # RSS feed monitor
│
└── shared/
    ├── types.ts                          # MODIFY: add new types
    ├── constants.ts                      # existing
    ├── config.ts                         # MODIFY: extend schema
    ├── db.ts                             # existing
    ├── logger.ts                         # existing
    ├── errors.ts                         # existing
    └── ipc-protocol.ts                   # existing
```

---

## 2. Notification Plugin System

### 2.1 Channel Interface

```typescript
// src/daemon/notification-channels/types.ts

export type Severity = 'critical' | 'warning' | 'info';

export interface NotificationPayload {
  agentId: string;
  title: string;
  message: string;
  severity: Severity;
  timestamp: string;
}

export interface NotificationChannel {
  name: string;
  isConfigured(): boolean;
  send(payload: NotificationPayload): Promise<void>;
}
```

### 2.2 Channel Registry

```typescript
// src/daemon/notification-channels/registry.ts

import type { NotificationChannel, NotificationPayload, Severity } from './types.js';
import { loadConfig } from '../../shared/config.js';
import { log } from '../../shared/logger.js';

const channels: NotificationChannel[] = [];

export function registerChannel(channel: NotificationChannel): void;
export function getConfiguredChannels(): NotificationChannel[];
export async function dispatchNotification(payload: NotificationPayload): Promise<void>;
// Iterates channels, checks severity filter, calls send()
```

### 2.3 Slack Channel

```typescript
// src/daemon/notification-channels/slack.ts

// Slack Incoming Webhook format:
// POST https://hooks.slack.com/services/T.../B.../xxx
// Body: { text, blocks?, attachments? }

export class SlackChannel implements NotificationChannel {
  name = 'slack';

  isConfigured(): boolean {
    const config = loadConfig();
    return !!config.notification.slack_webhook;
  }

  async send(payload: NotificationPayload): Promise<void> {
    const config = loadConfig();
    const color = payload.severity === 'critical' ? '#FF0000'
                : payload.severity === 'warning' ? '#FFA500' : '#36A64F';

    await fetch(config.notification.slack_webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [{
          color,
          title: payload.title,
          text: payload.message,
          fields: [
            { title: 'Agent', value: payload.agentId, short: true },
            { title: 'Severity', value: payload.severity, short: true },
          ],
          ts: Math.floor(Date.now() / 1000),
        }],
      }),
    });
  }
}
```

### 2.4 Discord Channel

```typescript
// src/daemon/notification-channels/discord.ts

// Discord Webhook format:
// POST https://discord.com/api/webhooks/{id}/{token}
// Body: { embeds: [{ title, description, color, fields }] }

export class DiscordChannel implements NotificationChannel {
  name = 'discord';

  isConfigured(): boolean {
    const config = loadConfig();
    return !!config.notification.discord_webhook;
  }

  async send(payload: NotificationPayload): Promise<void> {
    const config = loadConfig();
    const color = payload.severity === 'critical' ? 0xFF0000
                : payload.severity === 'warning' ? 0xFFA500 : 0x36A64F;

    await fetch(config.notification.discord_webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: payload.title,
          description: payload.message,
          color,
          fields: [
            { name: 'Agent', value: payload.agentId, inline: true },
            { name: 'Severity', value: payload.severity, inline: true },
          ],
          timestamp: payload.timestamp,
        }],
      }),
    });
  }
}
```

### 2.5 Telegram Channel

```typescript
// src/daemon/notification-channels/telegram.ts

// Telegram Bot API:
// POST https://api.telegram.org/bot{token}/sendMessage
// Body: { chat_id, text, parse_mode: 'HTML' }

export class TelegramChannel implements NotificationChannel {
  name = 'telegram';

  isConfigured(): boolean {
    const config = loadConfig();
    return !!(config.notification.telegram_token && config.notification.telegram_chat_id);
  }

  async send(payload: NotificationPayload): Promise<void> {
    const config = loadConfig();
    const icon = payload.severity === 'critical' ? '🔴'
               : payload.severity === 'warning' ? '🟡' : '🟢';

    const text = `${icon} <b>${payload.title}</b>\n\n${payload.message}\n\n`
               + `<i>Agent: ${payload.agentId}</i>`;

    await fetch(`https://api.telegram.org/bot${config.notification.telegram_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.notification.telegram_chat_id,
        text,
        parse_mode: 'HTML',
      }),
    });
  }
}
```

### 2.6 Notifier Refactor

```typescript
// src/daemon/notifier.ts (v0.2)
// CHANGE: delegate to channel registry instead of inline logic

import { getDb } from '../shared/db.js';
import { dispatchNotification } from './notification-channels/registry.js';
import type { Severity } from './notification-channels/types.js';

interface NotifyOptions {
  title?: string;
  severity?: Severity;
}

export async function sendNotification(
  agentId: string,
  message: string,
  options: NotifyOptions = {},
): Promise<void> {
  const { title = 'OmniWatch Alert', severity = 'info' } = options;

  // Record in DB
  const db = getDb();
  db.prepare(`
    INSERT INTO notifications (agent_id, channel, title, message, severity, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(agentId, 'all', title, message, severity, 'pending');

  // Dispatch to all configured channels
  await dispatchNotification({ agentId, title, message, severity, timestamp: new Date().toISOString() });

  // Update DB status
  db.prepare(
    "UPDATE notifications SET status = 'sent' WHERE agent_id = ? AND message = ? AND status = 'pending'"
  ).run(agentId, message);
}
```

---

## 3. Config Schema Extension

```typescript
// src/shared/config.ts - OmniConfig interface update

export interface OmniConfig {
  ai: {
    provider: string;
    api_key: string;
    model: string;
  };
  notification: {
    webhook_url: string;
    system: boolean;
    // NEW v0.2
    slack_webhook: string;
    discord_webhook: string;
    telegram_token: string;
    telegram_chat_id: string;
    channels: {
      slack?: { min_severity: Severity };
      discord?: { min_severity: Severity };
      telegram?: { min_severity: Severity };
    };
  };
  agent: {
    max_count: number;
    memory_limit_mb: number;
    heartbeat_interval_ms: number;
    heartbeat_timeout_ms: number;
    max_heal_attempts: number;
  };
}

// DEFAULT_CONFIG extension:
notification: {
  webhook_url: '',
  system: true,
  slack_webhook: '',
  discord_webhook: '',
  telegram_token: '',
  telegram_chat_id: '',
  channels: {},
}
```

---

## 4. AST Code Validator

```typescript
// src/daemon/code-validator.ts (v0.2 - acorn-based)

import * as acorn from 'acorn';
import { FORBIDDEN_APIS } from '../shared/constants.js';
import { log } from '../shared/logger.js';

interface ValidationResult {
  valid: boolean;
  issues: string[];
}

export function validateCode(code: string): ValidationResult {
  const issues: string[] = [];

  // Step 1: Parse AST
  let ast: acorn.Node;
  try {
    ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'module' });
  } catch (err) {
    issues.push(`Syntax error: ${err instanceof Error ? err.message : String(err)}`);
    return { valid: false, issues };
  }

  // Step 2: Walk AST to find violations
  walkNode(ast, (node: any) => {
    // Check import declarations
    if (node.type === 'ImportDeclaration' && typeof node.source.value === 'string') {
      if (FORBIDDEN_APIS.includes(node.source.value)) {
        issues.push(`Forbidden import: '${node.source.value}' is not allowed`);
      }
    }

    // Check call expressions
    if (node.type === 'CallExpression') {
      // eval()
      if (node.callee.type === 'Identifier' && node.callee.name === 'eval') {
        issues.push('eval() is not allowed');
      }
      // require()
      if (node.callee.type === 'Identifier' && node.callee.name === 'require') {
        issues.push('require() is not allowed, use import');
      }
      // process.exit()
      if (node.callee.type === 'MemberExpression'
          && node.callee.object.name === 'process'
          && node.callee.property.name === 'exit') {
        issues.push('process.exit() is not allowed');
      }
    }

    // Check new Function()
    if (node.type === 'NewExpression'
        && node.callee.type === 'Identifier'
        && node.callee.name === 'Function') {
      issues.push('new Function() is not allowed');
    }
  });

  // Step 3: Check for default export
  let hasDefaultExport = false;
  walkNode(ast, (node: any) => {
    if (node.type === 'ExportDefaultDeclaration') hasDefaultExport = true;
  });
  if (!hasDefaultExport) {
    issues.push('Agent must have a default export function');
  }

  if (issues.length > 0) {
    log('warn', `AST validation found ${issues.length} issue(s)`, { issues });
  }

  return { valid: issues.length === 0, issues };
}

// Simple recursive AST walker
function walkNode(node: any, visitor: (node: any) => void): void {
  if (!node || typeof node !== 'object') return;
  visitor(node);
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach(c => walkNode(c, visitor));
    } else if (child && typeof child === 'object' && child.type) {
      walkNode(child, visitor);
    }
  }
}
```

---

## 5. TUI Dashboard (Ink)

### 5.1 Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│  OmniWatch Dashboard    Agents: 5  Memory: 340MB    │
│  Uptime: 2h 15m         q:quit r:refresh            │
├─────────────────────────────────────────────────────┤
│  NAME              STATUS    PID    LAST RUN         │
│  ▸ coupang-monitor  ● running  12345  2m ago          │
│    github-watcher   ● running  12346  5m ago          │
│    api-health       ○ stopped  -      1h ago          │
│    rss-feed         ● running  12347  30s ago         │
│    stock-alert      ✕ error    -      10m ago         │
├─────────────────────────────────────────────────────┤
│  Logs: coupang-monitor                               │
│  10:30:15 INFO  Checked price: ₩189,000              │
│  10:29:14 INFO  Checked price: ₩189,000              │
│  10:28:13 WARN  Slow response (3.2s)                 │
│  10:27:12 INFO  Checked price: ₩192,000              │
└─────────────────────────────────────────────────────┘
```

### 5.2 Component Tree

```
Dashboard.tsx
├── StatusBar.tsx         (top: stats header)
├── AgentTable.tsx        (middle: selectable agent list)
│   └── useInput()        (keyboard: j/k navigate, s/x/d actions)
└── LogViewer.tsx         (bottom: selected agent's logs)
    └── useInterval()     (poll agent.logs every 2s)
```

### 5.3 Dashboard.tsx

```typescript
// src/cli/ui/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import { Box, useApp, useInput } from 'ink';
import { StatusBar } from './StatusBar.js';
import { AgentTable } from './AgentTable.js';
import { LogViewer } from './LogViewer.js';
import { rpcCall } from '../ipc-client.js';
import type { Agent } from '../../shared/types.js';

export function Dashboard(): React.ReactElement {
  const { exit } = useApp();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Poll agent list every 3s
  useEffect(() => {
    const refresh = async () => {
      const list = await rpcCall('agent.list', {}) as Agent[];
      setAgents(list);
      if (!selectedId && list.length > 0) setSelectedId(list[0].id);
    };
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, []);

  useInput((input, key) => {
    if (input === 'q') exit();
    if (input === 'r') { /* force refresh */ }
  });

  return (
    <Box flexDirection="column" height="100%">
      <StatusBar agents={agents} />
      <AgentTable
        agents={agents}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <LogViewer agentId={selectedId} />
    </Box>
  );
}
```

### 5.4 dash.ts Command

```typescript
// src/cli/commands/dash.ts

import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { Dashboard } from '../ui/Dashboard.js';
import { ensureDaemon } from './daemon.js';

export const dashCommand = new Command('dash')
  .description('Open real-time TUI dashboard')
  .action(async () => {
    await ensureDaemon();
    render(React.createElement(Dashboard));
  });
```

### 5.5 Build Configuration

```typescript
// tsup.config.ts - ADD new entry for TUI
{
  entry: ['src/cli/index.ts'],
  outDir: 'dist/cli',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  clean: true,
  banner: { js: '#!/usr/bin/env node' },
  // ADD: JSX support for Ink components
  esbuildOptions(options) {
    options.jsx = 'automatic';
    options.jsxImportSource = 'react';
  },
}
```

---

## 6. Chat Handler (Interactive Mode)

### 6.1 Chat Flow

```
$ omni chat agent-a1b2c3d4

🤖 Chatting with: coupang-monitor
   Type 'exit' to leave, 'apply' to apply changes

You: 체크 주기를 5분으로 변경해줘
AI:  현재 코드의 CHECK_INTERVAL을 300000 (5분)으로 변경했습니다.
     변경된 코드를 적용할까요? (y/n)

You: y
AI:  ✓ 코드 적용 완료. 에이전트가 재시작되었습니다.

You: 마지막 에러 보여줘
AI:  마지막 에러 (10분 전):
     "TypeError: Cannot read property 'price' of null"
     페이지 구조가 변경된 것 같습니다. 수정할까요?
```

### 6.2 chat-handler.ts

```typescript
// src/daemon/chat-handler.ts

import Anthropic from '@anthropic-ai/sdk';
import { loadConfig } from '../shared/config.js';
import { getAgent, updateAgent } from './agent-manager.js';
import { validateCode } from './code-validator.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AGENTS_DIR } from '../shared/constants.js';
import { getDb } from '../shared/db.js';
import type { AgentLog } from '../shared/types.js';

interface ChatResponse {
  message: string;
  modifiedCode?: string;  // if code was changed
  action?: 'apply' | 'info';
}

export async function handleChat(
  agentId: string,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<ChatResponse> {
  const agent = getAgent(agentId);
  if (!agent) throw new Error(`Agent ${agentId} not found`);

  // Load current agent code
  const codePath = join(AGENTS_DIR, agentId, 'index.js');
  const currentCode = readFileSync(codePath, 'utf-8');

  // Load recent logs for context
  const db = getDb();
  const recentLogs = db.prepare(
    'SELECT * FROM agent_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT 10'
  ).all(agentId) as AgentLog[];

  const config = loadConfig();
  const apiKey = config.ai.api_key || process.env.ANTHROPIC_API_KEY;
  const client = new Anthropic({ apiKey: apiKey! });

  const systemPrompt = `You are an AI assistant helping modify an OmniWatch monitoring agent.

Current agent: ${agent.name} (${agent.id})
Status: ${agent.status}
Original prompt: ${agent.prompt}

Current code:
\`\`\`javascript
${currentCode}
\`\`\`

Recent logs:
${recentLogs.map(l => `[${l.level}] ${l.message}`).join('\n')}

## Instructions
- If the user asks to modify behavior, respond with the full modified code in a JSON block.
- If the user asks about status/logs, respond with information only.
- Keep responses concise and in the user's language.

## Response Format
Respond with JSON:
{ "message": "explanation", "modifiedCode": "full code if changed", "action": "apply|info" }`;

  const messages = [
    ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userMessage },
  ];

  const response = await client.messages.create({
    model: config.ai.model || 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  let jsonText = text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  return JSON.parse(jsonText) as ChatResponse;
}

export function applyCodeChange(agentId: string, newCode: string): void {
  // Validate before applying
  const result = validateCode(newCode);
  if (!result.valid) {
    throw new Error(`Code validation failed: ${result.issues.join(', ')}`);
  }

  const codePath = join(AGENTS_DIR, agentId, 'index.js');
  writeFileSync(codePath, newCode);
}
```

### 6.3 New RPC Methods

```typescript
// src/daemon/handlers/chat.ts

import type { Socket } from 'node:net';
import { handleChat, applyCodeChange } from '../chat-handler.js';
import { restartAgent, getAgent } from '../agent-manager.js';
import { generateAgentCode } from '../code-generator.js';
import { validateCode } from '../code-validator.js';

// In-memory conversation history per agent
const conversations = new Map<string, Array<{ role: 'user' | 'assistant'; content: string }>>();

export const handleChatRPC = {
  async chat(params: Record<string, unknown>, _client: Socket) {
    const id = params.id as string;
    const message = params.message as string;

    const history = conversations.get(id) || [];
    const response = await handleChat(id, message, history);

    // Track conversation
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: response.message });
    conversations.set(id, history);

    return response;
  },

  async preview(params: Record<string, unknown>, _client: Socket) {
    const prompt = params.prompt as string;
    const result = await generateAgentCode(prompt);
    const validation = validateCode(result.code);
    return { ...result, validation };
  },

  async apply(params: Record<string, unknown>, _client: Socket) {
    const id = params.id as string;
    const code = params.code as string;

    applyCodeChange(id, code);
    await restartAgent(id);

    return { success: true, agentId: id };
  },
};
```

### 6.4 RPC Registration

```typescript
// src/daemon/rpc-server.ts - registerHandlers() additions

import { handleChatRPC } from './handlers/chat.js';

// ... existing handlers ...

// Chat handlers (v0.2)
handlers['agent.chat'] = handleChatRPC.chat;
handlers['agent.preview'] = handleChatRPC.preview;
handlers['agent.apply'] = handleChatRPC.apply;
```

---

## 7. Agent Templates

### 7.1 Template Interface

```typescript
// src/agent/templates/base-prompt.ts

export interface AgentTemplate {
  name: string;
  description: string;
  promptSuffix: string;  // appended to user prompt for better context
  defaultDependencies: string[];
}

export const BASE_SYSTEM_PROMPT = `...`; // extracted from code-generator.ts
```

### 7.2 Template Presets

```typescript
// src/agent/templates/web-monitor.ts
export const webMonitorTemplate: AgentTemplate = {
  name: 'web-monitor',
  description: 'Monitor a webpage for changes',
  promptSuffix: '\n\nUse cheerio to parse HTML. Compare with stored hash to detect changes.',
  defaultDependencies: ['cheerio'],
};

// src/agent/templates/api-checker.ts
export const apiCheckerTemplate: AgentTemplate = {
  name: 'api-checker',
  description: 'Monitor API endpoint health and response time',
  promptSuffix: '\n\nCheck response status, response time, and validate response body structure.',
  defaultDependencies: [],
};

// src/agent/templates/rss-watcher.ts
export const rssWatcherTemplate: AgentTemplate = {
  name: 'rss-watcher',
  description: 'Watch RSS feed for new entries',
  promptSuffix: '\n\nUse rss-parser to parse the feed. Notify on new entries not seen before.',
  defaultDependencies: ['rss-parser'],
};
```

### 7.3 watch Command Update

```typescript
// src/cli/commands/watch.ts (v0.2)
// ADD: --preview flag and --template option

export const watchCommand = new Command('watch')
  .description('Create and start a new monitoring agent')
  .argument('<prompt>', 'What to monitor')
  .option('-p, --preview', 'Preview generated code before running')
  .option('-t, --template <name>', 'Use preset template (web-monitor|api-checker|rss-watcher)')
  .action(async (prompt: string, options) => {
    await ensureDaemon();

    if (options.preview) {
      // Use agent.preview RPC → show code → ask y/n → agent.create or abort
      const spinner = ora('Generating preview...').start();
      const preview = await rpcCall('agent.preview', { prompt, template: options.template });
      spinner.stop();
      console.log(highlight(preview.code));  // syntax highlight
      const answer = await confirm('Deploy this agent?');
      if (!answer) return;
    }

    // ... existing creation flow with optional template param
  });
```

---

## 8. New Types

```typescript
// src/shared/types.ts additions

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
  modifiedCode?: string;
  action?: 'apply' | 'info';
}

export interface PreviewResult {
  name: string;
  description: string;
  code: string;
  dependencies: string[];
  validation: { valid: boolean; issues: string[] };
}
```

---

## 9. Implementation Order

| # | Task | Layer | Files | Dependency |
|---|------|-------|-------|------------|
| 1 | Notification channel types + registry | Daemon | notification-channels/types.ts, registry.ts | - |
| 2 | Extract webhook + system channels | Daemon | notification-channels/webhook.ts, system.ts | 1 |
| 3 | Refactor notifier.ts to use registry | Daemon | notifier.ts | 1, 2 |
| 4 | Slack channel | Daemon | notification-channels/slack.ts | 1 |
| 5 | Discord channel | Daemon | notification-channels/discord.ts | 1 |
| 6 | Telegram channel | Daemon | notification-channels/telegram.ts | 1 |
| 7 | Extend config schema | Shared | config.ts | - |
| 8 | AST code validator (acorn) | Daemon | code-validator.ts | `npm i acorn` |
| 9 | Agent templates | Agent | templates/*.ts | - |
| 10 | Extract base-prompt from code-generator | Daemon | code-generator.ts, base-prompt.ts | 9 |
| 11 | Preview RPC handler | Daemon | handlers/chat.ts (preview) | 10 |
| 12 | watch --preview + --template flags | CLI | commands/watch.ts | 11 |
| 13 | Install ink + react | CLI | package.json | `npm i ink react` |
| 14 | StatusBar.tsx | CLI | ui/StatusBar.tsx | 13 |
| 15 | AgentTable.tsx | CLI | ui/AgentTable.tsx | 13 |
| 16 | LogViewer.tsx | CLI | ui/LogViewer.tsx | 13 |
| 17 | Dashboard.tsx | CLI | ui/Dashboard.tsx | 14, 15, 16 |
| 18 | dash command | CLI | commands/dash.ts | 17 |
| 19 | Update tsup for JSX | Config | tsup.config.ts | 13 |
| 20 | Register dash in cli/index.ts | CLI | index.ts | 18 |
| 21 | Chat handler | Daemon | chat-handler.ts | - |
| 22 | Chat RPC handlers | Daemon | handlers/chat.ts | 21 |
| 23 | Register chat RPCs in rpc-server.ts | Daemon | rpc-server.ts | 22 |
| 24 | chat command (readline) | CLI | commands/chat.ts | 22 |
| 25 | Register chat in cli/index.ts | CLI | index.ts | 24 |
| 26 | New types in shared/types.ts | Shared | types.ts | - |
| 27 | Tests for notification channels | Test | tests/notification-channels.test.ts | 1-6 |
| 28 | Tests for AST validator | Test | tests/code-validator.test.ts (update) | 8 |
| 29 | Tests for chat handler | Test | tests/chat-handler.test.ts | 21 |
| 30 | Tests for templates | Test | tests/templates.test.ts | 9 |

---

## 10. Error Handling

| Error Code | Name | Description |
|------------|------|-------------|
| `CHAT_FAILED` | 채팅 실패 | AI 응답 파싱 실패 또는 API 오류 |
| `APPLY_FAILED` | 코드 적용 실패 | 코드 검증 실패 후 적용 거부 |
| `CHANNEL_SEND_FAILED` | 알림 전송 실패 | 개별 채널 전송 실패 (다른 채널은 계속) |
| `TEMPLATE_NOT_FOUND` | 템플릿 없음 | 존재하지 않는 템플릿 이름 |

---

## 11. Test Plan

| Type | Target | File |
|------|--------|------|
| Unit | NotificationChannel implementations | tests/notification-channels.test.ts |
| Unit | AST code-validator | tests/code-validator.test.ts (update) |
| Unit | Agent templates | tests/templates.test.ts |
| Unit | Chat handler response parsing | tests/chat-handler.test.ts |
| Unit | Channel registry dispatch | tests/notification-channels.test.ts |
| Integration | watch --preview flow | tests/watch-preview.test.ts |

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-27 | Initial v0.2 design | Paul |
