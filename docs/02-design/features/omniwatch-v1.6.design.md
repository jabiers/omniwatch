# Vigil v1.6 Design - Analytics Enhancement & Agent Detail

## Group 1: Analytics Enhancement

### 1-1. Date range selector
In `apps/web/src/app/analytics/page.tsx`:
- Add `timeRange` state: '1h' | '24h' | '7d' | '30d' (default '24h')
- Add button group with 4 options above the chart
- Pass time range as query param to API: `?hours=1|24|168|720`
- Filter client-side data within the selected window

### 1-2. CSV export
In `apps/web/src/app/analytics/page.tsx`:
- Add "Export CSV" button in header
- On click: convert current metrics/anomalies to CSV string
- Trigger browser download with `Blob` + `URL.createObjectURL`
- Format: timestamp, metric_name, value, period

### 1-3. Period toggle
In `apps/web/src/app/analytics/page.tsx`:
- Add `period` state: 'hourly' | 'daily' (default 'hourly')
- Toggle button group next to time range
- Pass as query param to metrics endpoint: `?period=hourly|daily`

## Group 2: Agent Detail

### 2-1. Log search
In `apps/web/src/app/agents/[id]/page.tsx`:
- Add `logSearch` state
- Add Search input above log list
- Filter logs: `log.message.toLowerCase().includes(logSearch.toLowerCase())`

### 2-2. Metrics mini chart
In `apps/web/src/app/agents/[id]/page.tsx`:
- Import LineChart from recharts
- Convert metrics data to chart format
- Show small line chart (height 200) in Metrics tab
- X-axis: time, Y-axis: metric value

## Group 3: Settings & Layout

### 3-1. Theme section in settings
In `apps/web/src/app/settings/page.tsx`:
- Add "Appearance" section at the top
- Import useTheme from theme-store
- Show current theme with toggle button
- Preview card showing dark/light appearance

### 3-2. Sidebar collapse
In `apps/web/src/app/layout.tsx`:
- Add `collapsed` state with localStorage persistence
- When collapsed: show only icons (w-16), hide text labels
- Add ChevronLeft/ChevronRight toggle button at sidebar bottom
- Animate width transition
