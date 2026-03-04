'use client';

import { useEffect, useState, useRef, useCallback, use, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Filter,
  Send,
  Code,
  Save,
  CheckCircle,
  XCircle,
  MessageSquare,
  BarChart3,
  Camera,
  GitBranch,
  RotateCw,
  Search,
  Terminal,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { apiFetch } from '../../../lib/api';
import { useToastStore } from '../../../lib/toast-store';
import { Skeleton, SkeletonCard, SkeletonTable } from '../../../components/skeleton';

interface MetricsData {
  run_count: number;
  success_count: number;
  error_count: number;
  avg_duration_ms: number;
  last_duration_ms: number;
}

interface AgentDetail {
  id: string;
  name: string;
  type: string;
  status: string;
  prompt?: string;
  created_at?: string;
  heal_count?: number;
  error_count?: number;
  last_run_at?: string;
  parent_id?: string | null;
  spawn_depth?: number;
}

interface SnapshotMeta {
  id: number;
  agent_id: string;
  seq: number;
  label: string | null;
  created_at: string;
}

interface ChildAgent {
  id: string;
  name: string;
  status: string;
  type: string;
  spawn_depth: number;
  created_at: string;
}

interface LogEntry {
  id: number;
  agent_id: string;
  level: string;
  message: string;
  metadata: string | null;
  created_at: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  modifiedCode?: string;
  autoApplied?: boolean;
  timestamp: number;
}

const logLevelColor: Record<string, string> = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  debug: 'text-gray-500',
};

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { addToast } = useToastStore();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [logFilter, setLogFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDestroy, setConfirmDestroy] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [applyingCode, setApplyingCode] = useState<number | null>(null);
  const [applyResult, setApplyResult] = useState<{
    index: number;
    success: boolean;
  } | null>(null);

  // Metrics history for chart
  interface MetricHistoryEntry {
    period_start?: string;
    created_at?: string;
    timestamp?: string;
    avg_value?: number;
    sum_value?: number;
    value?: number;
    count?: number;
    sample_count?: number;
  }
  const [metricsHistory, setMetricsHistory] = useState<MetricHistoryEntry[]>([]);

  // v0.5: Snapshots & spawn chain state
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [children, setChildren] = useState<ChildAgent[]>([]);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [restoringSeq, setRestoringSeq] = useState<number | null>(null);

  // Code editor state
  const [agentCode, setAgentCode] = useState('');
  const [codeOriginal, setCodeOriginal] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeSaving, setCodeSaving] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<
    'logs' | 'chat' | 'code' | 'terminal' | 'metrics' | 'snapshots' | 'children'
  >('logs');

  const logsEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadAgent = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/agents/${id}`);
      if (res.ok) {
        const data = (await res.json()) as { agent: AgentDetail };
        setAgent(data.agent);
      }
    } catch {
      // API not available
    }
  }, [id]);

  const loadLogs = useCallback(async () => {
    try {
      const levelParam = logFilter !== 'all' ? `?level=${logFilter}` : '';
      const res = await apiFetch(`/api/agents/${id}/logs${levelParam}`);
      if (res.ok) {
        const data = (await res.json()) as { logs: LogEntry[] };
        const raw: LogEntry[] = data.logs ?? [];
        // API returns DESC order, reverse to show oldest first (newest at bottom)
        setLogs(raw.reverse());
      }
    } catch {
      // API not available
    }
  }, [id, logFilter]);

  const loadMetrics = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/agents/${id}/metrics`);
      if (res.ok) {
        const data = (await res.json()) as { metrics: MetricsData };
        setMetrics(data.metrics);
      }
    } catch {
      // API not available
    }
  }, [id]);

  const loadMetricsHistory = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/analytics/metrics?agentId=${id}&period=hourly&limit=20`);
      if (res.ok) {
        const data = (await res.json()) as { metrics: MetricHistoryEntry[] };
        setMetricsHistory(data.metrics ?? []);
      }
    } catch {
      // Analytics API not available
    }
  }, [id]);

  const loadSnapshots = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/agents/${id}/snapshots`);
      if (res.ok) {
        const data = (await res.json()) as { snapshots?: SnapshotMeta[] };
        setSnapshots(data.snapshots ?? []);
      }
    } catch {
      // API not available
    }
  }, [id]);

  const loadCode = useCallback(async () => {
    setCodeLoading(true);
    try {
      const res = await apiFetch(`/api/agents/${id}/code`);
      if (res.ok) {
        const data = (await res.json()) as { code: string };
        setAgentCode(data.code);
        setCodeOriginal(data.code);
      }
    } catch {
      // API not available
    } finally {
      setCodeLoading(false);
    }
  }, [id]);

  /** Save code changes via apply endpoint */
  async function saveCode() {
    if (!agentCode.trim() || agentCode === codeOriginal) return;
    setCodeSaving(true);
    try {
      const res = await apiFetch(`/api/agents/${id}/apply`, {
        method: 'POST',
        body: JSON.stringify({ code: agentCode }),
      });
      if (res.ok) {
        setCodeOriginal(agentCode);
        addToast('Code applied & agent restarted', 'success');
        await loadAgent();
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        addToast(body.error || 'Failed to apply code', 'error');
      }
    } catch {
      addToast('Failed to save code', 'error');
    } finally {
      setCodeSaving(false);
    }
  }

  const loadChildren = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/agents/${id}/children`);
      if (res.ok) {
        const data = (await res.json()) as { children?: ChildAgent[] };
        setChildren(data.children ?? []);
      }
    } catch {
      // API not available
    }
  }, [id]);

  // Initial load
  useEffect(() => {
    async function initialLoad() {
      await Promise.allSettled([
        loadAgent(),
        loadLogs(),
        loadMetrics(),
        loadSnapshots(),
        loadChildren(),
      ]);
      setLoading(false);
    }
    initialLoad();
  }, [loadAgent, loadLogs, loadMetrics, loadSnapshots, loadChildren]);

  // Auto-refresh logs every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      loadAgent();
      loadLogs();
    }, 3000);
    return () => clearInterval(interval);
  }, [loadAgent, loadLogs]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  /** Send control action */
  async function sendAction(action: string) {
    if (action === 'destroy') {
      setActionLoading('destroy');
      try {
        const res = await apiFetch(`/api/agents/${id}`, { method: 'DELETE' });
        if (res.ok) {
          addToast('Agent destroyed', 'success');
          router.push('/agents');
          return;
        }
      } catch {
        // handle error
      } finally {
        setActionLoading(null);
        setConfirmDestroy(false);
      }
      return;
    }

    setActionLoading(action);
    try {
      const res = await apiFetch(`/api/agents/${id}/${action}`, { method: 'POST' });
      if (res.ok) {
        const label = action === 'start' ? 'started' : action === 'stop' ? 'stopped' : 'restarted';
        addToast(`Agent ${label}`, 'success');
      }
      await loadAgent();
    } catch {
      // handle error
    } finally {
      setActionLoading(null);
    }
  }

  /** Capture a snapshot */
  async function captureSnapshot() {
    setSnapshotLoading(true);
    try {
      await apiFetch(`/api/agents/${id}/snapshots`, { method: 'POST' });
      await loadSnapshots();
    } catch {
      /* ignore */
    } finally {
      setSnapshotLoading(false);
    }
  }

  /** Restore a snapshot */
  async function restoreSnapshotSeq(seq: number) {
    setRestoringSeq(seq);
    try {
      await apiFetch(`/api/agents/${id}/snapshots/${seq}/restore`, { method: 'POST' });
      await loadAgent();
    } catch {
      /* ignore */
    } finally {
      setRestoringSeq(null);
    }
  }

  /** Send chat message to modify agent */
  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || chatSending) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput.trim(),
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setChatSending(true);

    try {
      const res = await apiFetch(`/api/agents/${id}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (res.ok) {
        const raw = (await res.json()) as {
          result?: {
            message?: string;
            modifiedCode?: string;
            action?: string;
            autoApplied?: boolean;
          };
          message?: string;
          response?: string;
          modifiedCode?: string;
          code?: string;
          autoApplied?: boolean;
        };
        // API wraps response in { result: { message, modifiedCode, action, autoApplied } }
        const data = raw.result ?? raw;
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.message ?? (raw as { response?: string }).response ?? 'No response',
          modifiedCode: data.modifiedCode ?? (raw as { code?: string }).code,
          autoApplied: data.autoApplied,
          timestamp: Date.now(),
        };
        setChatMessages((prev) => [...prev, assistantMessage]);
        // Refresh agent status if code was auto-applied
        if (data.autoApplied) {
          await loadAgent();
        }
      } else {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        const errMessage: ChatMessage = {
          role: 'assistant',
          content: `Error: ${err.message ?? res.statusText}`,
          timestamp: Date.now(),
        };
        setChatMessages((prev) => [...prev, errMessage]);
      }
    } catch {
      const errMessage: ChatMessage = {
        role: 'assistant',
        content: 'Failed to send message. API may be unavailable.',
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, errMessage]);
    } finally {
      setChatSending(false);
    }
  }

  /** Apply code modification */
  async function applyCode(code: string, messageIndex: number) {
    setApplyingCode(messageIndex);
    setApplyResult(null);
    try {
      const res = await apiFetch(`/api/agents/${id}/apply`, {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      setApplyResult({ index: messageIndex, success: res.ok });
      if (res.ok) {
        await loadAgent();
      }
    } catch {
      setApplyResult({ index: messageIndex, success: false });
    } finally {
      setApplyingCode(null);
    }
  }

  const metricsChartData = useMemo(() => {
    if (!metricsHistory || !Array.isArray(metricsHistory) || metricsHistory.length === 0) return [];
    return metricsHistory.slice(-20).map((m) => ({
      time: new Date(
        m.period_start ?? m.created_at ?? m.timestamp ?? Date.now(),
      ).toLocaleTimeString(),
      value: m.avg_value ?? m.sum_value ?? m.value ?? 0,
      count: m.count ?? m.sample_count ?? 0,
    }));
  }, [metricsHistory]);

  const filteredLogs = (
    logFilter === 'all' ? logs : logs.filter((l) => l.level === logFilter)
  ).filter((log) => !logSearch || log.message?.toLowerCase().includes(logSearch.toLowerCase()));

  const displayMetrics = metrics;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <SkeletonCard />
        <div className="grid grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonTable rows={6} />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="space-y-4">
        <Link
          href="/agents"
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Agents
        </Link>
        <p className="text-gray-500">Agent not found.</p>
      </div>
    );
  }

  const statusColor =
    agent.status === 'running'
      ? 'bg-emerald-500'
      : agent.status === 'error'
        ? 'bg-red-500'
        : agent.status === 'healing'
          ? 'bg-yellow-500'
          : 'bg-gray-500';

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/agents"
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Agents
      </Link>

      {/* Agent Info */}
      <div className="glass-card">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold">{agent.name}</h1>
              <span className="flex items-center gap-1.5 text-sm capitalize">
                <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                {agent.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="capitalize">{agent.type}</span>
              {agent.created_at && (
                <span>Created {new Date(agent.created_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => sendAction('start')}
              disabled={actionLoading === 'start' || agent.status === 'running'}
              aria-label="Start agent"
              className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Start"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={() => sendAction('stop')}
              disabled={actionLoading === 'stop' || agent.status === 'stopped'}
              aria-label="Stop agent"
              className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Stop"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={() => sendAction('restart')}
              disabled={actionLoading === 'restart'}
              aria-label="Restart agent"
              className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Destroy with confirm */}
            {confirmDestroy ? (
              <div className="flex items-center gap-1 ml-1">
                <button
                  onClick={() => sendAction('destroy')}
                  disabled={actionLoading === 'destroy'}
                  className="px-3 py-2 rounded-lg text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-30 transition-colors"
                >
                  {actionLoading === 'destroy' ? 'Destroying...' : 'Confirm Destroy'}
                </button>
                <button
                  onClick={() => setConfirmDestroy(false)}
                  className="px-3 py-2 rounded-lg text-xs bg-white/[0.05] text-gray-400 hover:bg-white/[0.1] transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDestroy(true)}
                disabled={!!actionLoading}
                aria-label="Destroy agent"
                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Destroy"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Prompt */}
        {agent.prompt && (
          <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <p className="text-xs text-gray-500 mb-1">Prompt</p>
            <p className="text-sm font-mono">{agent.prompt}</p>
          </div>
        )}
      </div>

      {/* Metrics Summary */}
      {displayMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card text-center">
            <p className="text-xs text-gray-500 mb-1">Run Count</p>
            <p className="text-2xl font-bold">{displayMetrics.run_count}</p>
          </div>
          <div className="glass-card text-center">
            <p className="text-xs text-gray-500 mb-1">Success Rate</p>
            <p className="text-2xl font-bold">
              {displayMetrics.run_count > 0
                ? ((displayMetrics.success_count / displayMetrics.run_count) * 100).toFixed(1)
                : '0.0'}
              %
            </p>
          </div>
          <div className="glass-card text-center">
            <p className="text-xs text-gray-500 mb-1">Avg Duration</p>
            <p className="text-2xl font-bold">
              {displayMetrics.avg_duration_ms > 0
                ? (displayMetrics.avg_duration_ms / 1000).toFixed(1)
                : '0.0'}
              s
            </p>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 border-b border-white/[0.08] pb-0">
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors border-b-2 -mb-[1px] ${
            activeTab === 'logs'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Logs
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors border-b-2 -mb-[1px] ${
            activeTab === 'chat'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Chat
        </button>
        <button
          onClick={() => {
            setActiveTab('code');
            loadCode();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors border-b-2 -mb-[1px] ${
            activeTab === 'code'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          Code
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors border-b-2 -mb-[1px] ${
            activeTab === 'terminal'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Terminal
        </button>
        <button
          onClick={() => {
            setActiveTab('metrics');
            loadMetrics();
            loadMetricsHistory();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors border-b-2 -mb-[1px] ${
            activeTab === 'metrics'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Metrics
        </button>
        <button
          onClick={() => {
            setActiveTab('snapshots');
            loadSnapshots();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors border-b-2 -mb-[1px] ${
            activeTab === 'snapshots'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Snapshots
          {snapshots.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/[0.1] text-[10px]">
              {snapshots.length}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab('children');
            loadChildren();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors border-b-2 -mb-[1px] ${
            activeTab === 'children'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          Children
          {children.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/[0.1] text-[10px]">
              {children.length}
            </span>
          )}
        </button>
      </div>

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="glass-card !p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
            <h2 className="text-sm font-medium">Live Logs</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  aria-label="Search logs by message"
                />
              </div>
              <Filter className="w-3 h-3 text-gray-500" />
              {['all', 'info', 'warn', 'error', 'debug'].map((level) => (
                <button
                  key={level}
                  onClick={() => setLogFilter(level)}
                  className={`px-2 py-0.5 rounded text-xs capitalize transition-colors ${
                    logFilter === level
                      ? 'bg-white/[0.1] text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto p-4 space-y-0.5">
            {filteredLogs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No logs available.</p>
            ) : (
              filteredLogs.map((log, i) => (
                <div key={log.id ?? i} className="log-line flex gap-3">
                  <span className="text-gray-600 shrink-0">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                  <span
                    className={`w-12 shrink-0 uppercase ${logLevelColor[log.level] ?? 'text-gray-500'}`}
                  >
                    {log.level}
                  </span>
                  <span className="text-gray-300">{log.message}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="glass-card !p-0 flex flex-col h-[480px] max-h-[60vh]">
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">
                <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p>Chat with this agent to modify its behavior.</p>
                <p className="text-xs mt-1">
                  e.g. &quot;Change the check interval to 5 minutes&quot;
                </p>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-emerald-500/20 text-emerald-100'
                      : 'bg-white/[0.05] text-gray-300'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="text-sm prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-headings:text-gray-200 prose-strong:text-white prose-code:text-emerald-300 prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}

                  {/* Modified code preview */}
                  {msg.modifiedCode && (
                    <div className="mt-3 rounded-lg overflow-hidden border border-white/[0.08]">
                      <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] border-b border-white/[0.08]">
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Code className="w-3 h-3" />
                          Modified Code
                        </span>
                        {msg.autoApplied ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-400">
                            <CheckCircle className="w-3 h-3" />
                            Auto-applied
                          </span>
                        ) : applyResult?.index === i ? (
                          applyResult.success ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-400">
                              <CheckCircle className="w-3 h-3" />
                              Applied
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-red-400">
                              <XCircle className="w-3 h-3" />
                              Failed
                            </span>
                          )
                        ) : (
                          <button
                            onClick={() => applyCode(msg.modifiedCode!, i)}
                            disabled={applyingCode === i}
                            className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 transition-colors"
                          >
                            {applyingCode === i ? 'Applying...' : 'Apply'}
                          </button>
                        )}
                      </div>
                      <pre className="p-3 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
                        <code>{msg.modifiedCode}</code>
                      </pre>
                    </div>
                  )}

                  <p className="text-[10px] text-gray-600 mt-1.5">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {chatSending && (
              <div className="flex justify-start">
                <div className="bg-white/[0.05] rounded-lg px-4 py-2.5">
                  <span className="text-sm text-gray-500">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <form
            onSubmit={sendChat}
            className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.08]"
          >
            <label htmlFor="chat-input" className="sr-only">
              Chat with agent
            </label>
            <input
              id="chat-input"
              type="text"
              value={chatInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChatInput(e.target.value)}
              placeholder="Ask to modify this agent..."
              disabled={chatSending}
              className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50 placeholder:text-gray-600 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={chatSending || !chatInput.trim()}
              aria-label="Send message"
              className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Code Tab */}
      {activeTab === 'code' && (
        <div className="glass-card !p-0 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <Code className="w-3.5 h-3.5 text-emerald-400" />
              Agent Source Code
              <span className="text-[10px] text-gray-600 font-mono">index.js</span>
            </h2>
            <div className="flex items-center gap-2">
              {agentCode !== codeOriginal && (
                <span className="text-[10px] text-yellow-400">unsaved changes</span>
              )}
              <button
                onClick={saveCode}
                disabled={codeSaving || agentCode === codeOriginal || !agentCode.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-3 h-3" />
                {codeSaving ? 'Saving...' : 'Save & Restart'}
              </button>
            </div>
          </div>
          {codeLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">Loading code...</div>
          ) : (
            <div className="relative">
              <textarea
                value={agentCode}
                onChange={(e) => setAgentCode(e.target.value)}
                spellCheck={false}
                className="w-full min-h-[480px] max-h-[70vh] p-4 bg-transparent text-sm font-mono text-gray-300 leading-relaxed resize-y focus:outline-none"
                style={{ tabSize: 2 }}
                aria-label="Agent source code editor"
              />
            </div>
          )}
        </div>
      )}

      {/* Terminal Tab */}
      {activeTab === 'terminal' && <TerminalPanel agentId={id} />}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className="glass-card">
          {/* Performance Trend Chart */}
          {metricsChartData.length > 0 && (
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-5 mb-4">
              <h3 className="text-sm font-medium mb-3">Performance Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={metricsChartData}>
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <Tooltip
                    contentStyle={{
                      background: '#1a1a2e',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                    }}
                    itemStyle={{ color: '#e5e7eb' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    name="Avg Value"
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Count"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {displayMetrics ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <MetricCard label="Total Runs" value={String(displayMetrics.run_count)} />
                {(() => {
                  const rate =
                    displayMetrics.run_count > 0
                      ? displayMetrics.success_count / displayMetrics.run_count
                      : 0;
                  return (
                    <MetricCard
                      label="Success Rate"
                      value={`${(rate * 100).toFixed(1)}%`}
                      color={
                        rate >= 0.9
                          ? 'text-emerald-400'
                          : rate >= 0.7
                            ? 'text-yellow-400'
                            : 'text-red-400'
                      }
                    />
                  );
                })()}
                <MetricCard
                  label="Avg Duration"
                  value={`${displayMetrics.avg_duration_ms > 0 ? (displayMetrics.avg_duration_ms / 1000).toFixed(1) : '0.0'}s`}
                />
                <MetricCard
                  label="Errors"
                  value={String(displayMetrics.error_count)}
                  color={displayMetrics.error_count > 0 ? 'text-red-400' : 'text-gray-300'}
                />
                {agent?.heal_count != null && (
                  <MetricCard label="Heal Attempts" value={String(agent.heal_count)} />
                )}
                {agent?.last_run_at && (
                  <MetricCard
                    label="Last Run"
                    value={new Date(agent.last_run_at).toLocaleString()}
                    small
                  />
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No metrics available.</p>
          )}
        </div>
      )}

      {/* Snapshots Tab (Time Travel) */}
      {activeTab === 'snapshots' && (
        <div className="glass-card !p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              Time Travel Snapshots
            </h2>
            <button
              onClick={captureSnapshot}
              disabled={snapshotLoading}
              className="px-3 py-1.5 rounded-lg text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 transition-colors"
            >
              {snapshotLoading ? 'Capturing...' : 'Capture Snapshot'}
            </button>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {snapshots.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No snapshots captured yet.</p>
            ) : (
              snapshots.map((snap) => (
                <div key={snap.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-300">#{snap.seq}</span>
                      {snap.label && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs">
                          {snap.label}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-600">
                      {new Date(snap.created_at).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => restoreSnapshotSeq(snap.seq)}
                    disabled={restoringSeq === snap.seq}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] text-gray-400 hover:bg-white/[0.1] hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <RotateCw className="w-3 h-3" />
                    {restoringSeq === snap.seq ? 'Restoring...' : 'Restore'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Children Tab (Spawn Chain) */}
      {activeTab === 'children' && (
        <div className="glass-card !p-0">
          <div className="px-4 py-3 border-b border-white/[0.08]">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
              Spawn Chain
              {agent?.parent_id && (
                <span className="text-xs text-gray-500 ml-2">
                  (depth: {agent.spawn_depth ?? 0})
                </span>
              )}
            </h2>
          </div>
          {agent?.parent_id && (
            <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.06] text-xs text-gray-500">
              Parent:{' '}
              <a href={`/agents/${agent.parent_id}`} className="text-emerald-400 hover:underline">
                {agent.parent_id}
              </a>
            </div>
          )}
          <div className="divide-y divide-white/[0.06]">
            {children.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No child agents spawned.</p>
            ) : (
              children.map((child) => {
                const childStatus =
                  child.status === 'running'
                    ? 'bg-emerald-500'
                    : child.status === 'error'
                      ? 'bg-red-500'
                      : 'bg-gray-500';
                return (
                  <a
                    key={child.id}
                    href={`/agents/${child.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${childStatus}`} />
                        <span className="text-sm text-gray-300">{child.name}</span>
                        <span className="text-xs text-gray-600">depth: {child.spawn_depth}</span>
                      </div>
                      <span className="text-xs text-gray-600">{child.id}</span>
                    </div>
                    <span className="text-xs text-gray-500 capitalize">{child.status}</span>
                  </a>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Reusable metric display card */
function MetricCard({
  label,
  value,
  color,
  small,
}: {
  label: string;
  value: string;
  color?: string;
  small?: boolean;
}) {
  return (
    <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`${small ? 'text-sm' : 'text-xl'} font-bold ${color ?? 'text-gray-200'}`}>
        {value}
      </p>
    </div>
  );
}

/** Terminal panel for executing commands in agent context */
function TerminalPanel({ agentId }: { agentId: string }) {
  const [command, setCommand] = useState('');
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<
    {
      cmd: string;
      stdout?: string;
      stderr?: string;
      exitCode: number;
      error?: string;
      ts: number;
    }[]
  >([]);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  async function execCommand() {
    const cmd = command.trim();
    if (!cmd || running) return;
    setRunning(true);
    try {
      const res = await apiFetch(`/api/agents/${agentId}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, timeout: 30000 }),
      });
      const data = (await res.json()) as {
        stdout?: string;
        stderr?: string;
        exitCode?: number;
        error?: string;
      };
      setHistory((h) => [
        ...h,
        {
          cmd,
          stdout: data.stdout,
          stderr: data.stderr,
          exitCode: data.exitCode ?? (data.error ? 1 : 0),
          error: data.error,
          ts: Date.now(),
        },
      ]);
    } catch {
      setHistory((h) => [
        ...h,
        { cmd, error: 'Network error — could not reach API', exitCode: 1, ts: Date.now() },
      ]);
    } finally {
      setCommand('');
      setRunning(false);
    }
  }

  return (
    <div className="glass-card flex flex-col" style={{ minHeight: 400 }}>
      <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
        <Terminal className="w-3.5 h-3.5" />
        <span>Agent Terminal — commands execute in agent sandbox context</span>
      </div>

      {/* Output area */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto rounded-lg bg-black/40 border border-white/[0.06] p-3 font-mono text-xs space-y-3 mb-3"
        style={{ maxHeight: 400 }}
      >
        {history.length === 0 && (
          <p className="text-gray-600 select-none">
            Type a command below and press Enter. Allowed commands: ls, cat, curl, node, npm, git,
            docker, etc.
          </p>
        )}
        {history.map((entry, i) => (
          <div key={i}>
            <div className="text-emerald-400 mb-1">
              <span className="text-gray-600 mr-2">$</span>
              {entry.cmd}
            </div>
            {entry.stdout && (
              <pre className="text-gray-300 whitespace-pre-wrap">{entry.stdout}</pre>
            )}
            {entry.stderr && <pre className="text-red-400 whitespace-pre-wrap">{entry.stderr}</pre>}
            {entry.error && <pre className="text-red-400 whitespace-pre-wrap">{entry.error}</pre>}
            <div className="text-gray-600 mt-0.5">
              exit {entry.exitCode} &middot; {new Date(entry.ts).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          execCommand();
        }}
        className="flex gap-2"
      >
        <div className="flex-1 flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.08] px-3">
          <span className="text-emerald-500 font-mono text-sm">$</span>
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Enter command..."
            disabled={running}
            className="flex-1 bg-transparent py-2.5 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none"
            aria-label="Terminal command input"
          />
        </div>
        <button
          type="submit"
          disabled={running || !command.trim()}
          className="px-4 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
        >
          {running ? 'Running...' : 'Run'}
        </button>
      </form>
    </div>
  );
}
