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
