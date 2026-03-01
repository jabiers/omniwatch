'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Layers,
  RefreshCw,
  RotateCcw,
  Clock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Inbox,
} from 'lucide-react';
import { Pagination } from '../../components/pagination';
import { apiFetch } from '../../lib/api';

interface QueueStats {
  pending: number;
  processing: number;
  done_today: number;
  dead_letters: number;
}

interface DeadLetter {
  id: number;
  topic: string;
  error: string;
  payload?: string;
  created_at: string;
}

const PAGE_LIMIT = 20;

const defaultStats: QueueStats = {
  pending: 0,
  processing: 0,
  done_today: 0,
  dead_letters: 0,
};

export default function QueuePage() {
  const [stats, setStats] = useState<QueueStats>(defaultStats);
  const [deadLetters, setDeadLetters] = useState<DeadLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [bulkRetrying, setBulkRetrying] = useState(false);
  const [dlPage, setDlPage] = useState(1);
  const [dlHasNextPage, setDlHasNextPage] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const dlOffset = (dlPage - 1) * PAGE_LIMIT;
      const [statsRes, dlRes] = await Promise.allSettled([
        apiFetch('/api/queue/stats'),
        apiFetch(`/api/queue/dead-letters?limit=${PAGE_LIMIT}&offset=${dlOffset}`),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const data = (await statsRes.value.json()) as QueueStats;
        setStats(data ?? defaultStats);
      }

      if (dlRes.status === 'fulfilled' && dlRes.value.ok) {
        const data = (await dlRes.value.json()) as { dead_letters?: DeadLetter[] };
        const list = data.dead_letters ?? [];
        setDeadLetters(list);
        setDlHasNextPage(list.length === PAGE_LIMIT);
      }

      setError(null);
    } catch {
      setError('Failed to connect to API server');
    } finally {
      setLoading(false);
    }
  }, [dlPage]);

  // Initial load + auto-refresh every 30s
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  /** Retry a single dead letter entry */
  async function handleRetry(id: number) {
    setRetrying(id);
    try {
      const res = await apiFetch(`/api/queue/dead-letters/${id}/retry`, {
        method: 'POST',
      });
      if (res.ok) {
        // Remove from local list and reload stats
        setDeadLetters((prev) => prev.filter((d) => d.id !== id));
        await loadData();
      }
    } catch {
      // Retry failed silently
    } finally {
      setRetrying(null);
    }
  }

  /** Retry all dead letter entries */
  async function handleRetryAll() {
    setBulkRetrying(true);
    try {
      for (const dl of deadLetters) {
        await apiFetch(`/api/queue/dead-letters/${dl.id}/retry`, { method: 'POST' });
      }
      setDeadLetters([]);
      await loadData();
    } catch {
      // Bulk retry failed
    } finally {
      setBulkRetrying(false);
    }
  }

  const statCards = [
    {
      label: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Processing',
      value: stats.processing,
      icon: Loader2,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Done Today',
      value: stats.done_today,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Dead Letters',
      value: stats.dead_letters,
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading queue data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <Layers className="w-6 h-6 text-emerald-400" />
            Message Queue
          </h1>
          <p className="text-sm text-gray-500 mt-1">Queue throughput and dead letter management</p>
        </div>
        <button
          onClick={loadData}
          aria-label="Refresh queue data"
          className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:bg-white/[0.1] transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Queue Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-white/60 uppercase tracking-wider">{card.label}</span>
                <span className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </span>
              </div>
              <p className="text-3xl font-bold">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Dead Letter Queue */}
      <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            Dead Letter Queue
          </h2>
          <div className="flex items-center gap-3">
            {deadLetters.length > 0 && (
              <button
                onClick={handleRetryAll}
                disabled={bulkRetrying}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 transition-colors"
                aria-label="Retry all dead letters"
              >
                <RotateCcw className={`w-3 h-3 ${bulkRetrying ? 'animate-spin' : ''}`} />
                Retry All
              </button>
            )}
            <span className="text-xs text-white/40">
              {deadLetters.length} entr{deadLetters.length === 1 ? 'y' : 'ies'}
            </span>
          </div>
        </div>

        {deadLetters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Inbox className="w-8 h-8 mb-2 text-gray-600" />
            <p className="text-sm">No dead letters. All clear.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {deadLetters.map((dl) => (
              <div
                key={dl.id}
                className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-xs font-mono">
                      {dl.topic}
                    </span>
                    <span className="text-xs text-white/40">
                      {new Date(dl.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-white/60 truncate">{dl.error}</p>
                </div>
                <button
                  onClick={() => handleRetry(dl.id)}
                  disabled={retrying === dl.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  <RotateCcw className={`w-3 h-3 ${retrying === dl.id ? 'animate-spin' : ''}`} />
                  Retry
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Dead Letter Pagination */}
        {deadLetters.length > 0 && (
          <Pagination
            page={dlPage}
            totalPages={dlHasNextPage ? dlPage + 1 : dlPage}
            onPageChange={(p) => {
              setDlPage(p);
            }}
          />
        )}
      </div>
    </div>
  );
}
