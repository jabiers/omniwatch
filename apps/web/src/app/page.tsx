'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Bot,
  AlertTriangle,
  Play,
  Bell,
  Square,
  Activity,
  Wifi,
  WifiOff,
  Plus,
  BookOpen,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useWebSocket } from '../lib/ws';
import { apiFetch } from '../lib/api';
import { Skeleton } from '../components/skeleton';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  last_run_at?: string;
  created_at?: string;
}

interface Notification {
  id: number;
  agent_id: string;
  title: string;
  severity: string;
  message: string;
  created_at: string;
}

interface SystemStatus {
  uptime?: number;
  agentCount?: number;
  runningCount?: number;
  daemonPid?: number;
  daemonRunning?: boolean;
}

const statusColor: Record<string, string> = {
  running: 'bg-emerald-500',
  stopped: 'bg-gray-500',
  error: 'bg-red-500',
  healing: 'bg-yellow-500',
};

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const loadData = useCallback(async () => {
    try {
      const [agentsRes, notifsRes, statusRes] = await Promise.allSettled([
        apiFetch('/api/agents'),
        apiFetch('/api/notifications'),
        apiFetch('/api/system/status'),
      ]);

      if (agentsRes.status === 'fulfilled' && agentsRes.value.ok) {
        const data = (await agentsRes.value.json()) as { agents: Agent[] };
        setAgents(data.agents ?? []);
      }

      if (notifsRes.status === 'fulfilled' && notifsRes.value.ok) {
        const data = (await notifsRes.value.json()) as { notifications: Notification[] };
        setNotifications(data.notifications ?? []);
      }

      if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
        const data = (await statusRes.value.json()) as SystemStatus;
        setSystemStatus(data);
      }
    } catch {
      // API might not be available yet
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh every 30s (WebSocket handles real-time updates)
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // WebSocket for real-time updates
  const wsUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'ws://localhost:3457/ws';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = process.env.NEXT_PUBLIC_WS_HOST || window.location.host;
    return `${protocol}//${wsHost}/ws`;
  }, []);

  const handleWsMessage = useCallback(
    (msg: unknown) => {
      const data = msg as { type?: string };
      if (
        data.type === 'agent:status' ||
        data.type === 'agent:update' ||
        data.type === 'notification'
      ) {
        loadData();
      }
    },
    [loadData],
  );

  const { connected: wsConnected } = useWebSocket(wsUrl, handleWsMessage);

  /** Send start/stop action for an agent */
  async function sendAction(agentId: string, action: 'start' | 'stop') {
    setActionLoading(`${agentId}-${action}`);
    try {
      const res = await apiFetch(`/api/agents/${agentId}/${action}`, {
        method: 'POST',
      });
      if (res.ok) {
        await loadData();
      }
    } catch {
      // handle error
    } finally {
      setActionLoading(null);
    }
  }

  const running = agents.filter((a) => a.status === 'running').length;
  const errors = agents.filter((a) => a.status === 'error').length;
  const todayNotifs = notifications.filter((n) => {
    const d = new Date(n.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  const stats = [
    {
      label: 'Total Agents',
      value: systemStatus?.agentCount ?? agents.length,
      icon: Bot,
      color: 'text-blue-400',
    },
    {
      label: 'Running',
      value: systemStatus?.runningCount ?? running,
      icon: Play,
      color: 'text-emerald-400',
    },
    {
      label: 'Errors',
      value: errors,
      icon: AlertTriangle,
      color: 'text-red-400',
    },
    {
      label: 'Notifications Today',
      value: todayNotifs,
      icon: Bell,
      color: 'text-yellow-400',
    },
  ];

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    agents.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [agents]);

  const STATUS_COLORS: Record<string, string> = {
    running: '#10b981',
    stopped: '#6b7280',
    error: '#ef4444',
    healing: '#eab308',
    idle: '#3b82f6',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2 text-xs">
          {wsConnected ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Wifi className="w-3.5 h-3.5" />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-gray-500">
              <WifiOff className="w-3.5 h-3.5" />
              Polling
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">{stat.label}</span>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-3xl font-bold">{loading ? '—' : stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link
          href="/agents/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm hover:bg-emerald-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Agent
        </Link>
        <Link
          href="/recipes"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500/10 text-blue-400 text-sm hover:bg-blue-500/20 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Browse Recipes
        </Link>
      </div>

      {/* System Uptime */}
      {systemStatus?.uptime != null && (
        <div className="glass-card flex items-center gap-3">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-gray-400">System Uptime:</span>
          <span className="text-sm font-mono">{formatUptime(systemStatus.uptime)}</span>
        </div>
      )}

      {/* Agent Distribution */}
      {agents.length > 0 && (
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-5">
          <h2 className="text-sm font-medium mb-4">Agent Distribution</h2>
          <div className="flex items-center justify-center" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1a1a2e',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                  }}
                  itemStyle={{ color: '#e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-3">
            {statusData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: STATUS_COLORS[entry.name] || '#6b7280' }}
                />
                {entry.name}: {entry.value}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Agents */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Recent Agents</h2>
            <Link href="/agents" className="text-xs text-emerald-400 hover:text-emerald-300">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : agents.length === 0 ? (
            <p className="text-sm text-gray-500">
              No agents yet.{' '}
              <Link href="/agents/new" className="text-emerald-400 hover:underline">
                Create one
              </Link>
            </p>
          ) : (
            <div className="space-y-1">
              {agents.slice(0, 5).map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.05] transition-colors group"
                >
                  <Link
                    href={`/agents/${agent.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${statusColor[agent.status] ?? 'bg-gray-500'}`}
                    />
                    <span className="text-sm truncate">{agent.name}</span>
                    <span className="text-xs text-gray-500 capitalize shrink-0">{agent.type}</span>
                  </Link>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {agent.status !== 'running' && (
                      <button
                        onClick={() => sendAction(agent.id, 'start')}
                        disabled={actionLoading === `${agent.id}-start`}
                        aria-label={`Start agent ${agent.name}`}
                        className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 transition-colors"
                        title="Start"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    )}
                    {agent.status === 'running' && (
                      <button
                        onClick={() => sendAction(agent.id, 'stop')}
                        disabled={actionLoading === `${agent.id}-stop`}
                        aria-label={`Stop agent ${agent.name}`}
                        className="p-1 rounded bg-white/[0.05] text-gray-400 hover:bg-white/[0.1] disabled:opacity-30 transition-colors"
                        title="Stop"
                      >
                        <Square className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Notifications */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Recent Notifications</h2>
            <Link href="/notifications" className="text-xs text-emerald-400 hover:text-emerald-300">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-gray-500">No notifications yet.</p>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 5).map((n) => (
                <div key={n.id} className="flex items-start gap-3 py-2 px-3 rounded-lg">
                  <SeverityBadge severity={n.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{n.message}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {n.agent_id} &middot; {new Date(n.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Severity badge with colored background */
function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { dot: string; text: string; bg: string }> = {
    critical: { dot: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10' },
    warning: {
      dot: 'bg-yellow-500',
      text: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    info: { dot: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/10' },
  };
  const sc = config[severity] ?? config.info;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] capitalize mt-0.5 shrink-0 ${sc.bg} ${sc.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
      {severity}
    </span>
  );
}

/** Format seconds to human-readable uptime */
function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}
