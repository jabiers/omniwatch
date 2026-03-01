# OmniWatch v1.5 Design - Reusable Components & Dashboard Polish

## Group 1: Reusable Components

### 1-1. SkeletonLoader
Create `apps/web/src/components/skeleton.tsx`:
```tsx
export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/[0.08] ${className ?? ''}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
```

### 1-2. StatusBadge
Create `apps/web/src/components/status-badge.tsx`:
```tsx
const statusStyles: Record<string, { dot: string; text: string }> = {
  running: { dot: 'bg-emerald-500', text: 'text-emerald-400' },
  stopped: { dot: 'bg-gray-500', text: 'text-gray-400' },
  error: { dot: 'bg-red-500', text: 'text-red-400' },
  healing: { dot: 'bg-yellow-500', text: 'text-yellow-400' },
  idle: { dot: 'bg-blue-500', text: 'text-blue-400' },
  // severity
  info: { dot: 'bg-blue-500', text: 'text-blue-400' },
  warn: { dot: 'bg-yellow-500', text: 'text-yellow-400' },
  critical: { dot: 'bg-red-500', text: 'text-red-400' },
};

export function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] ?? { dot: 'bg-gray-500', text: 'text-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}
```

### 1-3. Apply SkeletonLoader
Replace loading states in:
- `page.tsx` (dashboard): Replace "Loading..." → `<SkeletonCard />` x4
- `agents/page.tsx`: Replace loading div → `<SkeletonTable rows={5} />`
- `settings/page.tsx`: Replace "Loading..." → skeleton
- `agents/[id]/page.tsx`: Replace "Loading..." → skeleton

## Group 2: Dashboard Enhancement

### 2-1. Quick action cards
In `page.tsx`, add after stats cards:
- "Create New Agent" card linking to `/agents/new`
- "View All Agents" / "View All Notifications" links under respective sections

### 2-2. Agent status pie chart
In `page.tsx`:
- Import `PieChart, Pie, Cell, Tooltip` from recharts
- Calculate status counts from agents array
- Render small PieChart (200x200) showing distribution

## Group 3: Consistency

### 3-1. Apply StatusBadge
- `agents/page.tsx`: Replace inline `statusConfig` with `<StatusBadge />`
- `notifications/page.tsx`: Replace severity styling with `<StatusBadge />`
- `agents/[id]/page.tsx`: Replace inline status color with `<StatusBadge />`

### 3-2. EmptyState component
Create `apps/web/src/components/empty-state.tsx`:
```tsx
import { Inbox } from 'lucide-react';

export function EmptyState({ message = 'No data found' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <Inbox className="w-8 h-8 mb-2 text-gray-600" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
```
