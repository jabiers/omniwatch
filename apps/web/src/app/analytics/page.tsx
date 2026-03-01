'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  BarChart3,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Agent {
  id: string;
  name: string;
  status: string;
}

interface MetricRow {
  metric_name: string;
  avg_value: number;
  min_value: number;
  max_value: number;
  count: number;
  period_start: string;
}

interface Anomaly {
  agent_id: string;
  metric_name: string;
  current_value: number;
  mean: number;
  stddev: number;
  z_score: number;
}

interface AlertRule {
  id: number;
  tenant_id: string;
  metric_name: string;
  operator: string;
  threshold: number;
  window_minutes: number;
  notify_channels: string;
  enabled: boolean | number;
  created_at: string;
}

interface AlertFormData {
  metric_name: string;
  operator: string;
  threshold: number;
  window_minutes: number;
  notify_channels: string;
}

const OPERATORS = ['>', '<', '>=', '<='] as const;

const DEFAULT_FORM: AlertFormData = {
  metric_name: '',
  operator: '>',
  threshold: 0,
  window_minutes: 5,
  notify_channels: 'log',
};

/** Color palette for chart lines */
const CHART_COLORS = [
  '#34d399', // emerald-400
  '#60a5fa', // blue-400
  '#f472b6', // pink-400
  '#fbbf24', // amber-400
  '#a78bfa', // violet-400
  '#fb923c', // orange-400
  '#2dd4bf', // teal-400
  '#f87171', // red-400
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function AnalyticsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Alert CRUD state
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [alertForm, setAlertForm] = useState<AlertFormData>(DEFAULT_FORM);
  const [alertSaving, setAlertSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Data Loading                                                     */
  /* ---------------------------------------------------------------- */

  /** Load agent list for the selector */
  const loadAgents = useCallback(async () => {
    try {
      const res = await apiFetch('/api/agents');
      if (res.ok) {
        const data = (await res.json()) as Agent[] | { agents?: Agent[] };
        const list: Agent[] = Array.isArray(data) ? data : (data.agents ?? []);
        setAgents(list);
        if (!selectedAgent && list.length > 0) {
          setSelectedAgent(list[0].id);
        }
      }
    } catch {
      // API not available
    }
  }, [selectedAgent]);

  /** Load analytics data */
  const loadAnalytics = useCallback(async () => {
    setError(null);
    try {
      const fetches: Promise<Response>[] = [
        apiFetch('/api/analytics/anomalies'),
        apiFetch('/api/analytics/alerts'),
      ];

      if (selectedAgent) {
        fetches.push(apiFetch(`/api/analytics/metrics?agentId=${selectedAgent}&period=hourly`));
      }

      const results = await Promise.allSettled(fetches);

      // Anomalies
      if (results[0].status === 'fulfilled' && results[0].value.ok) {
        const data = (await results[0].value.json()) as Anomaly[];
        setAnomalies(Array.isArray(data) ? data : []);
      }

      // Alert Rules
      if (results[1].status === 'fulfilled' && results[1].value.ok) {
        const data = (await results[1].value.json()) as AlertRule[];
        setAlertRules(Array.isArray(data) ? data : []);
      }

      // Metrics
      if (results[2]?.status === 'fulfilled' && results[2].value.ok) {
        const data = (await results[2].value.json()) as MetricRow[];
        setMetrics(Array.isArray(data) ? data : []);
      } else if (selectedAgent) {
        setMetrics([]);
      }

      setLastRefresh(new Date());
    } catch {
      setError('Failed to load analytics data. API may be unavailable.');
    } finally {
      setLoading(false);
    }
  }, [selectedAgent]);

  // Load agents on mount
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // Load analytics when agent changes or on mount, auto-refresh every 30s
  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 30_000);
    return () => clearInterval(interval);
  }, [loadAnalytics]);

  /* ---------------------------------------------------------------- */
  /*  Chart data transformations                                       */
  /* ---------------------------------------------------------------- */

  /** Distinct metric names present in the data */
  const metricNames = useMemo(() => [...new Set(metrics.map((m) => m.metric_name))], [metrics]);

  /**
   * Build time-series data for LineChart.
   * Each data point = { time, [metric_name]: avg_value, ... }
   */
  const lineChartData = useMemo(() => {
    const grouped = new Map<string, Record<string, number | string>>();
    for (const row of metrics) {
      const key = row.period_start;
      if (!grouped.has(key)) {
        const d = new Date(key);
        grouped.set(key, {
          time: key,
          label: d.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        });
      }
      grouped.get(key)![row.metric_name] = Number(row.avg_value.toFixed(2));
    }
    return [...grouped.values()].sort((a, b) => String(a.time).localeCompare(String(b.time)));
  }, [metrics]);

  /**
   * Build bar chart data: latest avg_value per metric for comparison.
   */
  const barChartData = useMemo(() => {
    // Pick the latest period_start per metric
    const latest = new Map<string, MetricRow>();
    for (const row of metrics) {
      const existing = latest.get(row.metric_name);
      if (!existing || row.period_start > existing.period_start) {
        latest.set(row.metric_name, row);
      }
    }
    return [...latest.values()].map((row) => ({
      metric: row.metric_name,
      avg: Number(row.avg_value.toFixed(2)),
      min: Number(row.min_value.toFixed(2)),
      max: Number(row.max_value.toFixed(2)),
    }));
  }, [metrics]);

  /* ---------------------------------------------------------------- */
  /*  Alert Rule CRUD                                                  */
  /* ---------------------------------------------------------------- */

  function openCreateForm() {
    setEditingRule(null);
    setAlertForm(DEFAULT_FORM);
    setShowAlertForm(true);
  }

  function openEditForm(rule: AlertRule) {
    setEditingRule(rule);
    let channels: string;
    try {
      const parsed = JSON.parse(rule.notify_channels) as unknown;
      channels = Array.isArray(parsed) ? parsed.join(', ') : String(parsed);
    } catch {
      channels = rule.notify_channels || 'log';
    }
    setAlertForm({
      metric_name: rule.metric_name,
      operator: rule.operator,
      threshold: rule.threshold,
      window_minutes: rule.window_minutes,
      notify_channels: channels,
    });
    setShowAlertForm(true);
  }

  function closeForm() {
    setShowAlertForm(false);
    setEditingRule(null);
    setAlertForm(DEFAULT_FORM);
  }

  async function handleAlertSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlertSaving(true);

    // Build channels as JSON array
    const channelsArray = alertForm.notify_channels
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const body = {
      metric_name: alertForm.metric_name,
      operator: alertForm.operator,
      threshold: Number(alertForm.threshold),
      window_minutes: Number(alertForm.window_minutes),
      notify_channels: JSON.stringify(channelsArray),
    };

    try {
      const url = editingRule ? `/api/analytics/alerts/${editingRule.id}` : '/api/analytics/alerts';
      const method = editingRule ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        closeForm();
        await loadAnalytics();
      } else {
        const err = await res.text();
        setError(`Failed to ${editingRule ? 'update' : 'create'} rule: ${err}`);
      }
    } catch {
      setError('Network error while saving alert rule.');
    } finally {
      setAlertSaving(false);
    }
  }

  async function handleDeleteRule(id: number) {
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/analytics/alerts/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadAnalytics();
      } else {
        setError('Failed to delete alert rule.');
      }
    } catch {
      setError('Network error while deleting alert rule.');
    } finally {
      setDeletingId(null);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */

  function agentName(agentId: string): string {
    const agent = agents.find((a) => a.id === agentId);
    return agent?.name ?? agentId;
  }

  function formatOperator(op: string): string {
    const map: Record<string, string> = {
      '>': '>',
      '<': '<',
      '>=': '>=',
      '<=': '<=',
      '==': '=',
      '!=': '!=',
      gt: '>',
      lt: '<',
      gte: '>=',
      lte: '<=',
      eq: '=',
      neq: '!=',
    };
    return map[op] ?? op;
  }

  /* ---------------------------------------------------------------- */
  /*  Custom recharts tooltip                                          */
  /* ---------------------------------------------------------------- */

  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 shadow-lg">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.dataKey} className="text-xs font-mono" style={{ color: entry.color }}>
            {entry.dataKey}: {entry.value}
          </p>
        ))}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Agent metrics, anomaly detection &amp; alert rules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600">{lastRefresh.toLocaleTimeString()}</span>
          <button
            onClick={loadAnalytics}
            aria-label="Refresh analytics"
            className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:bg-white/[0.1] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Agent Selector */}
      <div className="flex items-center gap-3">
        <label htmlFor="analytics-agent" className="text-sm text-gray-400">
          Agent:
        </label>
        <select
          id="analytics-agent"
          value={selectedAgent}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setSelectedAgent(e.target.value);
            setLoading(true);
          }}
          className="px-3 py-1.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-gray-300 focus:outline-none focus:border-emerald-500/50 transition-colors"
        >
          {agents.length === 0 ? (
            <option value="">No agents available</option>
          ) : (
            agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.id.slice(0, 8)})
              </option>
            ))
          )}
        </select>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss error" className="ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card text-center">
          <p className="text-xs text-gray-500 mb-1">Metric Rows</p>
          <p className="text-2xl font-bold">{metrics.length}</p>
        </div>
        <div className="glass-card text-center">
          <p className="text-xs text-gray-500 mb-1">Anomalies</p>
          <p className={`text-2xl font-bold ${anomalies.length > 0 ? 'text-amber-400' : ''}`}>
            {anomalies.length}
          </p>
        </div>
        <div className="glass-card text-center">
          <p className="text-xs text-gray-500 mb-1">Alert Rules</p>
          <p className="text-2xl font-bold">{alertRules.length}</p>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Metric Trend (LineChart)                                      */}
      {/* ============================================================ */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.08]">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Metric Trends
            {selectedAgent && (
              <span className="text-xs text-gray-500 font-normal">
                &mdash; {agentName(selectedAgent)} (hourly)
              </span>
            )}
          </h2>
        </div>
        {lineChartData.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">
            No metric data available for this agent.
          </p>
        ) : (
          <div className="p-4">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={false}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                {metricNames.map((name, idx) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-3 px-1">
              {metricNames.map((name, idx) => (
                <div key={name} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                    }}
                  />
                  <span className="text-xs text-gray-400 font-mono">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  Agent Metric Comparison (BarChart)                            */}
      {/* ============================================================ */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.08]">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
            Agent Metric Comparison
            <span className="text-xs text-gray-500 font-normal">&mdash; latest period</span>
          </h2>
        </div>
        {barChartData.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">No metric data to compare.</p>
        ) : (
          <div className="p-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barChartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="metric"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={false}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avg" fill="#34d399" radius={[4, 4, 0, 0]} name="Avg" />
                <Bar dataKey="min" fill="#60a5fa" radius={[4, 4, 0, 0]} name="Min" />
                <Bar dataKey="max" fill="#f472b6" radius={[4, 4, 0, 0]} name="Max" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3 px-1">
              {[
                { label: 'Avg', color: '#34d399' },
                { label: 'Min', color: '#60a5fa' },
                { label: 'Max', color: '#f472b6' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  Anomaly Detection                                             */}
      {/* ============================================================ */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.08]">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Anomaly Detection
          </h2>
        </div>
        {anomalies.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            No anomalies detected. All metrics are within normal range.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Anomaly detection results">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    Agent
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    Metric
                  </th>
                  <th
                    scope="col"
                    className="text-right text-xs font-medium text-gray-500 px-4 py-3"
                  >
                    Current
                  </th>
                  <th
                    scope="col"
                    className="text-right text-xs font-medium text-gray-500 px-4 py-3"
                  >
                    Mean
                  </th>
                  <th
                    scope="col"
                    className="text-right text-xs font-medium text-gray-500 px-4 py-3"
                  >
                    Z-Score
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    Std Dev
                  </th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a) => (
                  <tr
                    key={`${a.agent_id}-${a.metric_name}`}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-300">{agentName(a.agent_id)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-amber-400">{a.metric_name}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-300 font-mono">
                      {a.current_value.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500 font-mono">
                      {a.mean.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          Math.abs(a.z_score) >= 3
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {a.z_score.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {a.stddev.toFixed(2)} &sigma;
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  Alert Rules + CRUD                                            */}
      {/* ============================================================ */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Alert Rules
          </h2>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Rule
          </button>
        </div>

        {/* Create / Edit Form */}
        {showAlertForm && (
          <div className="px-4 py-4 border-b border-white/[0.08] bg-white/[0.02]">
            <form onSubmit={handleAlertSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {/* Metric Name */}
                <div>
                  <label htmlFor="alert-metric" className="block text-xs text-gray-500 mb-1">
                    Metric Name
                  </label>
                  <input
                    id="alert-metric"
                    type="text"
                    required
                    value={alertForm.metric_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAlertForm({ ...alertForm, metric_name: e.target.value })
                    }
                    placeholder="cpu_usage"
                    className="w-full px-3 py-1.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>

                {/* Operator */}
                <div>
                  <label htmlFor="alert-operator" className="block text-xs text-gray-500 mb-1">
                    Operator
                  </label>
                  <select
                    id="alert-operator"
                    value={alertForm.operator}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setAlertForm({ ...alertForm, operator: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-gray-300 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  >
                    {OPERATORS.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Threshold */}
                <div>
                  <label htmlFor="alert-threshold" className="block text-xs text-gray-500 mb-1">
                    Threshold
                  </label>
                  <input
                    id="alert-threshold"
                    type="number"
                    step="any"
                    required
                    value={alertForm.threshold}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAlertForm({
                        ...alertForm,
                        threshold: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-gray-300 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>

                {/* Window Minutes */}
                <div>
                  <label htmlFor="alert-window" className="block text-xs text-gray-500 mb-1">
                    Window (min)
                  </label>
                  <input
                    id="alert-window"
                    type="number"
                    min={1}
                    required
                    value={alertForm.window_minutes}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAlertForm({
                        ...alertForm,
                        window_minutes: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-gray-300 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>

                {/* Notify Channels */}
                <div>
                  <label htmlFor="alert-channels" className="block text-xs text-gray-500 mb-1">
                    Channels
                  </label>
                  <input
                    id="alert-channels"
                    type="text"
                    required
                    value={alertForm.notify_channels}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAlertForm({
                        ...alertForm,
                        notify_channels: e.target.value,
                      })
                    }
                    placeholder="log, slack"
                    className="w-full px-3 py-1.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={alertSaving}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                >
                  {alertSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] text-gray-400 hover:bg-white/[0.1] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Rules Table */}
        {alertRules.length === 0 && !showAlertForm ? (
          <p className="text-sm text-gray-500 text-center py-6">
            No alert rules configured. Click &ldquo;New Rule&rdquo; to create one.
          </p>
        ) : alertRules.length === 0 ? null : (
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Alert rules">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    Metric
                  </th>
                  <th
                    scope="col"
                    className="text-center text-xs font-medium text-gray-500 px-4 py-3"
                  >
                    Condition
                  </th>
                  <th
                    scope="col"
                    className="text-center text-xs font-medium text-gray-500 px-4 py-3"
                  >
                    Window
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    Channels
                  </th>
                  <th
                    scope="col"
                    className="text-center text-xs font-medium text-gray-500 px-4 py-3"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="text-right text-xs font-medium text-gray-500 px-4 py-3"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {alertRules.map((rule) => {
                  let channels: string[];
                  try {
                    const parsed = JSON.parse(rule.notify_channels) as unknown;
                    channels = Array.isArray(parsed) ? (parsed as string[]) : [String(parsed)];
                  } catch {
                    channels = [rule.notify_channels || 'log'];
                  }

                  return (
                    <tr
                      key={rule.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-mono text-emerald-400">
                        {rule.metric_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="px-2 py-0.5 rounded bg-white/[0.05] text-gray-300 font-mono text-xs">
                          {formatOperator(rule.operator)} {rule.threshold}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-400">
                        {rule.window_minutes}m
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {channels.map((ch) => (
                            <span
                              key={ch}
                              className="px-1.5 py-0.5 rounded text-xs bg-white/[0.05] text-gray-400"
                            >
                              {ch}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {rule.enabled ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-white/[0.05] text-gray-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditForm(rule)}
                            aria-label="Edit rule"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.05] transition-colors"
                            title="Edit rule"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            disabled={deletingId === rule.id}
                            aria-label="Delete rule"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                            title="Delete rule"
                          >
                            {deletingId === rule.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
