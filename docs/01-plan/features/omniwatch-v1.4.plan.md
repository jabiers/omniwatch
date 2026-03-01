# OmniWatch v1.4 Plan - UX & Performance

## Overview
- **Version**: 1.4.0
- **Theme**: Dark/Light Theme, Agent Search, API Timeout, Polling Optimization
- **Priority**: HIGH

## Goals
1. Add dark/light theme toggle for accessibility
2. Add agent search by name for quick filtering
3. Add API request timeout to prevent hanging requests
4. Reduce polling frequency and leverage existing WebSocket
5. Add consistent loading/error states across pages

## Feature Groups

### Group 1: Theme System (3 tasks)
| ID | Task | Description |
|----|------|-------------|
| 1-1 | Theme context + store | Create theme store with localStorage persistence |
| 1-2 | Theme toggle button | Add toggle in sidebar bottom section |
| 1-3 | CSS theme variables | Add light mode class styles to globals.css |

### Group 2: Agent Search & UX (2 tasks)
| ID | Task | Description |
|----|------|-------------|
| 2-1 | Agent search input | Add name search box to agents page with debounced filter |
| 2-2 | Queue bulk retry | Add "Retry All" button for dead letter queue |

### Group 3: API & Performance (3 tasks)
| ID | Task | Description |
|----|------|-------------|
| 3-1 | API timeout | Add 15s timeout to apiFetch wrapper |
| 3-2 | Reduce polling intervals | Dashboard/agents/notifications: 5s→30s, queue: 10s→30s |
| 3-3 | WebSocket expansion | Agents + notifications pages subscribe to WS events |

## Acceptance Criteria
- Theme toggle works and persists across page reloads
- Agent search filters list by name (case-insensitive)
- API calls timeout after 15s with user-visible error
- Polling intervals increased to 30s on all pages
- Build: 6/6, TypeScript: 0 errors, ESLint: 0 errors, Tests: 376+
