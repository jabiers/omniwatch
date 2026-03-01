'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Filter, Calendar, Check, Eye } from 'lucide-react';
import { Pagination } from '../../components/pagination';
import { apiFetch } from '../../lib/api';
import { useWebSocket } from '../../lib/ws';

interface Notification {
  id: number;
  agent_id: string;
  channel: string;
  title: string;
  severity: string;
  message: string;
  status: string;
  created_at: string;
}

const severityConfig: Record<string, { dot: string; text: string; bg: string }> = {
  critical: {
    dot: 'bg-red-500',
    text: 'text-red-400',
    bg: 'bg-red-500/10',
  },
  warning: {
    dot: 'bg-yellow-500',
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
  },
  info: {
    dot: 'bg-blue-500',
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
};

const severityOptions = ['all', 'critical', 'warning', 'info'];

const PAGE_LIMIT = 20;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterAgent, setFilterAgent] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const offset = (page - 1) * PAGE_LIMIT;
      const res = await apiFetch(`/api/notifications?limit=${PAGE_LIMIT}&offset=${offset}`);
      if (res.ok) {
        const data = (await res.json()) as Notification[] | { notifications?: Notification[] };
        const list = Array.isArray(data) ? data : (data.notifications ?? []);
        setNotifications(list);
        setHasNextPage(list.length === PAGE_LIMIT);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, [page]);

  // Initial load + auto-refresh every 30s (WebSocket handles real-time updates)
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // WebSocket for real-time notification updates
  const wsUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'ws://localhost:3456/ws';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = process.env.NEXT_PUBLIC_WS_HOST || window.location.host;
    return `${protocol}//${wsHost}/ws`;
  }, []);

  const handleWsMessage = useCallback(
    (msg: unknown) => {
      const data = msg as { type?: string };
      if (data.type === 'notification') {
        loadNotifications();
      }
    },
    [loadNotifications],
  );

  useWebSocket(wsUrl, handleWsMessage);

  // Get unique agent names for filter
  const agentNames = Array.from(new Set(notifications.map((n) => n.agent_id)));

  // Filter notifications (client-side filtering applied on the current page)
  const filtered = notifications.filter((n) => {
    if (filterSeverity !== 'all' && n.severity !== filterSeverity) return false;
    if (filterAgent !== 'all' && n.agent_id !== filterAgent) return false;

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      const created = new Date(n.created_at);
      if (created < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      const created = new Date(n.created_at);
      if (created > to) return false;
    }

    return true;
  });

  const totalPages = hasNextPage ? page + 1 : page;

  /** Mark a single notification as read (local state) */
  function markAsRead(id: number) {
    setReadIds((prev) => new Set([...prev, String(id)]));
  }

  /** Mark all visible as read */
  function markAllAsRead() {
    setReadIds((prev) => {
      const next = new Set(prev);
      filtered.forEach((n) => next.add(String(n.id)));
      return next;
    });
  }

  const unreadCount = filtered.filter((n) => !readIds.has(String(n.id))).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-400 bg-emerald-500/10 rounded-lg hover:bg-emerald-500/20 transition-colors"
          >
            <Check className="w-3 h-3" />
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Severity filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-500">Severity:</span>
          <div className="flex gap-1">
            {severityOptions.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setFilterSeverity(s);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-md text-xs capitalize transition-colors ${
                  filterSeverity === s
                    ? 'bg-white/[0.1] text-white'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Agent filter */}
        {agentNames.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="notif-agent-filter" className="text-xs text-gray-500">
              Agent:
            </label>
            <select
              id="notif-agent-filter"
              value={filterAgent}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setFilterAgent(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1 rounded-md text-xs bg-white/[0.05] border border-white/[0.08] text-gray-300 focus:outline-none"
            >
              <option value="all">All</option>
              {agentNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date range filter */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <label htmlFor="notif-date-from" className="text-xs text-gray-500">
            From:
          </label>
          <input
            id="notif-date-from"
            type="date"
            value={dateFrom}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="px-2 py-1 rounded-md text-xs bg-white/[0.05] border border-white/[0.08] text-gray-300 focus:outline-none [color-scheme:dark]"
          />
          <label htmlFor="notif-date-to" className="text-xs text-gray-500">
            To:
          </label>
          <input
            id="notif-date-to"
            type="date"
            value={dateTo}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="px-2 py-1 rounded-md text-xs bg-white/[0.05] border border-white/[0.08] text-gray-300 focus:outline-none [color-scheme:dark]"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="text-xs text-gray-500">
        {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
        {filterSeverity !== 'all' || filterAgent !== 'all' || dateFrom || dateTo
          ? ' (filtered)'
          : ''}
      </div>

      {/* Table */}
      <div className="glass-card !p-0 overflow-hidden">
        <table className="w-full" aria-label="Notification list">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th
                scope="col"
                className="text-left text-xs font-medium text-gray-500 px-6 py-3 w-10"
              >
                <span className="sr-only">Read status</span>
              </th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                Severity
              </th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                Message
              </th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                Agent
              </th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                Timestamp
              </th>
              <th scope="col" className="text-right text-xs font-medium text-gray-500 px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center text-sm text-gray-500 py-8">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-sm text-gray-500 py-8">
                  No notifications found.
                </td>
              </tr>
            ) : (
              filtered.map((n) => {
                const sc = severityConfig[n.severity] ?? severityConfig.info;
                const isRead = readIds.has(String(n.id));
                return (
                  <tr
                    key={n.id}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                      isRead ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Unread dot */}
                    <td className="px-6 py-3">
                      {!isRead && <span className="w-2 h-2 rounded-full bg-emerald-500 block" />}
                    </td>
                    {/* Severity badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs capitalize ${sc.bg} ${sc.text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {n.severity}
                      </span>
                    </td>
                    {/* Message */}
                    <td className="px-4 py-3 text-sm max-w-md">
                      {n.title && (
                        <span className={`block text-xs text-gray-500 mb-0.5`}>{n.title}</span>
                      )}
                      <span className={isRead ? '' : 'font-medium'}>{n.message}</span>
                    </td>
                    {/* Agent */}
                    <td className="px-4 py-3 text-sm text-gray-400">{n.agent_id}</td>
                    {/* Timestamp */}
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(n.created_at).toLocaleString()}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      {!isRead && (
                        <button
                          onClick={() => markAsRead(n.id)}
                          aria-label="Mark as read"
                          className="p-1 rounded text-gray-500 hover:text-gray-300 transition-colors"
                          title="Mark as read"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && notifications.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={(p) => {
            setPage(p);
            setLoading(true);
          }}
        />
      )}
    </div>
  );
}
