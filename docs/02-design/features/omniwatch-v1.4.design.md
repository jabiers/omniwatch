# OmniWatch v1.4 Design - UX & Performance

## Group 1: Theme System

### 1-1. Theme store
Create `apps/web/src/lib/theme-store.ts`:
- Uses `useSyncExternalStore` pattern (same as ws-store)
- Reads initial theme from `localStorage.getItem('omniwatch-theme')` (default: 'dark')
- Exports `useTheme()` hook returning `{ theme, toggleTheme }`
- On toggle: update localStorage + toggle `dark` class on `<html>`

### 1-2. Theme toggle button
In `apps/web/src/app/layout.tsx`:
- Import `useTheme` from theme-store
- Add Sun/Moon icon toggle button in sidebar bottom (above logout)
- Call `toggleTheme()` on click

### 1-3. CSS light mode
In `apps/web/src/app/globals.css`:
- Add `.light` root variables overriding dark defaults:
  ```css
  html:not(.dark) {
    --bg-primary: #f8fafc;
    --bg-card: rgba(0, 0, 0, 0.02);
    --border: rgba(0, 0, 0, 0.1);
    --text-primary: #1e293b;
    --text-secondary: #64748b;
  }
  ```
- Override sidebar/header bg colors for light mode
- Override scrollbar colors for light mode

In `layout.tsx`:
- Change hardcoded `className="dark"` to dynamic based on theme store

## Group 2: Agent Search & UX

### 2-1. Agent search
In `apps/web/src/app/agents/page.tsx`:
- Add `searchQuery` state
- Add search input with Search icon above the agent table
- Filter: `agents.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))`
- Apply search filter before status filter

### 2-2. Queue bulk retry
In `apps/web/src/app/queue/page.tsx`:
- Add "Retry All" button next to "Dead Letter Queue" header
- POST to `/api/queue/dead-letters/retry-all` (or loop through current dead letters)
- Show loading spinner during bulk retry
- Reload data after completion

## Group 3: API & Performance

### 3-1. API timeout
In `apps/web/src/lib/api.ts`:
- Add AbortController with 15s timeout
- On timeout: show toast "Request timed out"
- Cleanup: abort on completion

### 3-2. Reduce polling
Change all polling intervals to 30s:
- `apps/web/src/app/page.tsx`: 5000 → 30000
- `apps/web/src/app/agents/page.tsx`: 5000 → 30000
- `apps/web/src/app/notifications/page.tsx`: 5000 → 30000
- `apps/web/src/app/queue/page.tsx`: 10000 → 30000
- `apps/web/src/app/mesh/page.tsx`: 5000 → 30000
- `apps/web/src/app/analytics/page.tsx`: leave at 30000 (already optimal)

### 3-3. WebSocket expansion
In agents/page.tsx and notifications/page.tsx:
- Import useWebSocket and handle agent:status / notification events
- On WS event: call loadData() (same pattern as dashboard)
- Use same wsUrl memo pattern as page.tsx
