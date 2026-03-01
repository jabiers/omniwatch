import type { TerminalStep } from '../hooks/useTypingAnimation';

export const NAV_ITEMS = [
  { href: '#features', label: 'Features' },
  { href: '#usecases', label: 'Use Cases' },
  { href: '#architecture', label: 'Architecture' },
  { href: '#quickstart', label: 'Quick Start' },
  { href: '#timeline', label: 'Timeline' },
  { href: '#tech', label: 'Tech Stack' },
];

export const TERMINAL_STEPS: TerminalStep[] = [
  {
    command: 'omni watch "Alert me when AirPods Pro drops below $250 on Amazon"',
    output: [
      'Analyzing prompt...',
      'Agent type: watcher (auto-detected)',
      'Generated code: 47 lines',
      'AST validation: \x1b[32mpassed\x1b[0m',
      'Agent [amazon-airpods] created and running.',
    ],
  },
  {
    command: 'omni list',
    output: [
      'ID              NAME                STATUS    LAST CHECK',
      'agent-a1b2      amazon-airpods      running   30s ago',
      'agent-c3d4      btc-price-alert     running   10s ago',
      'agent-e5f6      hackernews-ai       running   2m ago',
    ],
  },
  {
    command: 'omni status agent-a1b2',
    output: [
      'Name:     amazon-airpods',
      'Type:     watcher',
      'Status:   running (self-healed 2x)',
      'Uptime:   3d 14h 22m',
      'Checks:   1,247 total',
      'Last:     "AirPods Pro at $279 - above threshold"',
    ],
  },
];

export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export const FEATURES: Feature[] = [
  {
    icon: '🧠',
    title: 'Prompt-to-Agent',
    description:
      'Describe tasks in plain language. AI generates, validates, and deploys agents automatically.',
  },
  {
    icon: '🔄',
    title: 'Self-Healing',
    description:
      'Crashed agents are diagnosed and repaired by AI. Zero downtime, zero manual intervention.',
  },
  {
    icon: '🕸️',
    title: 'Agent Mesh',
    description:
      'Pub/sub event bus for inter-agent communication. Agents collaborate and spawn children autonomously.',
  },
  {
    icon: '🛡️',
    title: 'Sandbox Isolation',
    description:
      'VM-based sandboxing with strict, standard, and permissive security levels. AST validation before deploy.',
  },
  {
    icon: '📊',
    title: 'Analytics & Anomaly Detection',
    description:
      'Real-time metrics, Z-score anomaly detection, configurable alert rules with multi-channel notifications.',
  },
  {
    icon: '🏪',
    title: 'Marketplace',
    description:
      'Community recipe library with ratings and reviews. One-click install of pre-built agent templates.',
  },
];

export interface Version {
  version: string;
  theme: string;
  highlight: string;
}

export const VERSIONS: Version[] = [
  { version: 'v0.4', theme: 'Foundation', highlight: 'Monorepo + Dashboard' },
  { version: 'v0.5', theme: 'Agent Platform', highlight: 'Mesh + Time Travel + MCP' },
  { version: 'v0.6', theme: 'Enterprise', highlight: 'Sandbox + Queue + Multi-Tenant' },
  { version: 'v0.7', theme: 'Security', highlight: 'OAuth + Marketplace' },
  { version: 'v0.8', theme: 'Production', highlight: 'Docker + CI/CD + 352 Tests' },
  { version: 'v0.9', theme: 'Quality', highlight: 'TypeScript Strict Mode' },
  { version: 'v1.0', theme: 'Stable', highlight: 'Zero TS Errors + Release' },
  { version: 'v1.1', theme: 'Hardening', highlight: 'Rate Limit + Husky + CORS' },
  { version: 'v1.2', theme: 'Observability', highlight: 'Web Tests + a11y + OpenAPI' },
  { version: 'v1.3', theme: 'DX', highlight: 'Version Sync + Bundle Analyzer' },
  { version: 'v1.4', theme: 'UX', highlight: 'Dark/Light Theme + Search' },
  { version: 'v1.5', theme: 'Components', highlight: 'Skeleton + StatusBadge' },
  { version: 'v1.6', theme: 'Analytics', highlight: 'CSV Export + Charts' },
  { version: 'v1.7', theme: 'Tenant Mgmt', highlight: 'Tenant Mgmt + Marketplace UX' },
  { version: 'v1.8', theme: 'Sync & Auth', highlight: 'CLI Auth + Login Flow + Docs Sync' },
  { version: 'v1.9', theme: 'Isolation', highlight: 'Tenant Isolation + WS Logs + E2E' },
  { version: 'v2.0', theme: 'Unified', highlight: 'Unified Architecture (Single Process)' },
  { version: 'v2.1', theme: 'Security', highlight: 'RBAC Fix + Type Safety' },
  { version: 'v2.2', theme: 'Cleanup', highlight: 'Complete Daemon Removal (CLI HTTP)' },
  { version: 'v2.3', theme: 'IPC Cleanup', highlight: 'IPC Protocol Fully Removed (-3,090 LOC)' },
  { version: 'v2.4', theme: 'Type Safety', highlight: 'as-any Removal + Zod Validation' },
  { version: 'v2.5', theme: 'Reliability', highlight: 'Error Handling + 10 New Tests' },
  { version: 'v2.6', theme: 'Current', highlight: 'DB Indexes + Query Optimization' },
];

export interface Stat {
  value: number;
  suffix: string;
  label: string;
}

export const STATS: Stat[] = [
  { value: 349, suffix: '+', label: 'Tests Passing' },
  { value: 65, suffix: '+', label: 'API Endpoints' },
  { value: 18, suffix: '', label: 'Database Tables' },
  { value: 14, suffix: '', label: 'Dashboard Pages' },
  { value: 15, suffix: '', label: 'CLI Commands' },
  { value: 22, suffix: '', label: 'Releases' },
];

export interface TechCategory {
  category: string;
  items: string[];
}

export const TECH_STACK: TechCategory[] = [
  { category: 'Runtime', items: ['TypeScript 5', 'Node.js 20+'] },
  { category: 'Monorepo', items: ['Turborepo', 'pnpm'] },
  { category: 'Backend', items: ['Hono', 'SQLite', 'Zod'] },
  { category: 'Frontend', items: ['Next.js 15', 'React 19', 'Tailwind v4', 'Recharts'] },
  { category: 'AI', items: ['Anthropic Claude', 'OpenAI', 'Ollama', 'MCP Protocol'] },
  { category: 'DevOps', items: ['Docker', 'GitHub Actions', 'Vitest', 'ESLint'] },
  { category: 'Security', items: ['OAuth', 'RBAC', 'Rate Limiting', 'CORS'] },
  { category: 'DX', items: ['Husky', 'Commitlint', 'Prettier', 'Bundle Analyzer'] },
];
