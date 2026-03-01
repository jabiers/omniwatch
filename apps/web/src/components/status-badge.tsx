const statusStyles: Record<string, { dot: string; text: string }> = {
  running: { dot: 'bg-emerald-500', text: 'text-emerald-400' },
  stopped: { dot: 'bg-gray-500', text: 'text-gray-400' },
  error: { dot: 'bg-red-500', text: 'text-red-400' },
  healing: { dot: 'bg-yellow-500', text: 'text-yellow-400' },
  idle: { dot: 'bg-blue-500', text: 'text-blue-400' },
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
