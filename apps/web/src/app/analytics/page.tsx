"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Activity,
} from "lucide-react";

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

export default function AnalyticsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  /** Load agent list for the selector */
  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const data = await res.json();
        const list: Agent[] = Array.isArray(data) ? data : data.agents ?? [];
        setAgents(list);
        // Auto-select first agent if none selected
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
        fetch("/api/analytics/anomalies"),
        fetch("/api/analytics/alerts"),
      ];

      // Only fetch metrics if an agent is selected
      if (selectedAgent) {
        fetches.push(
          fetch(
            `/api/analytics/metrics?agentId=${selectedAgent}&period=hourly`
          )
        );
      }

      const results = await Promise.allSettled(fetches);

      // Anomalies — API returns array directly
      if (results[0].status === "fulfilled" && results[0].value.ok) {
        const data = await results[0].value.json();
        setAnomalies(Array.isArray(data) ? data : []);
      }

      // Alert Rules — API returns array directly
      if (results[1].status === "fulfilled" && results[1].value.ok) {
        const data = await results[1].value.json();
        setAlertRules(Array.isArray(data) ? data : []);
      }

      // Metrics — API returns array directly
      if (results[2]?.status === "fulfilled" && results[2].value.ok) {
        const data = await results[2].value.json();
        setMetrics(Array.isArray(data) ? data : []);
      } else if (selectedAgent) {
        setMetrics([]);
      }

      setLastRefresh(new Date());
    } catch {
      setError("Failed to load analytics data. API may be unavailable.");
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

  /** Resolve agent name from id */
  function agentName(agentId: string): string {
    const agent = agents.find((a) => a.id === agentId);
    return agent?.name ?? agentId;
  }

  /** Format operator for display */
  function formatOperator(op: string): string {
    const map: Record<string, string> = {
      ">": ">",
      "<": "<",
      ">=": ">=",
      "<=": "<=",
      "==": "=",
      "!=": "!=",
      gt: ">",
      lt: "<",
      gte: ">=",
      lte: "<=",
      eq: "=",
      neq: "!=",
    };
    return map[op] ?? op;
  }

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
          <span className="text-xs text-gray-600">
            {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={loadAnalytics}
            className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:bg-white/[0.1] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Agent Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">Agent:</label>
        <select
          value={selectedAgent}
          onChange={(e) => {
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
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
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
          <p
            className={`text-2xl font-bold ${
              anomalies.length > 0 ? "text-amber-400" : ""
            }`}
          >
            {anomalies.length}
          </p>
        </div>
        <div className="glass-card text-center">
          <p className="text-xs text-gray-500 mb-1">Alert Rules</p>
          <p className="text-2xl font-bold">{alertRules.length}</p>
        </div>
      </div>

      {/* Agent Metrics Table */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.08]">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Agent Metrics Overview
            {selectedAgent && (
              <span className="text-xs text-gray-500 font-normal">
                &mdash; {agentName(selectedAgent)} (hourly)
              </span>
            )}
          </h2>
        </div>
        {metrics.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            No metrics available for this agent.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    Metric
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">
                    Avg
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">
                    Min
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">
                    Max
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">
                    Count
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    Period Start
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((row, i) => (
                  <tr
                    key={`${row.metric_name}-${row.period_start}-${i}`}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-emerald-400">
                      {row.metric_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-300 font-mono">
                      {typeof row.avg_value === "number"
                        ? row.avg_value.toFixed(2)
                        : row.avg_value}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500 font-mono">
                      {typeof row.min_value === "number"
                        ? row.min_value.toFixed(2)
                        : row.min_value ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500 font-mono">
                      {typeof row.max_value === "number"
                        ? row.max_value.toFixed(2)
                        : row.max_value ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-400">
                      {row.count}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(row.period_start).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Anomaly Detection */}
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
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    Agent
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    Metric
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">
                    Current
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">
                    Mean
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">
                    Z-Score
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
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
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {agentName(a.agent_id)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-amber-400">
                      {a.metric_name}
                    </td>
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
                            ? "bg-red-500/10 text-red-400"
                            : "bg-amber-500/10 text-amber-400"
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

      {/* Alert Rules */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.08]">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Alert Rules
          </h2>
        </div>
        {alertRules.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            No alert rules configured.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    Metric
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    Agent
                  </th>
                  <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">
                    Condition
                  </th>
                  <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {alertRules.map((rule) => (
                  <tr
                    key={rule.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-emerald-400">
                      {rule.metric_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {rule.tenant_id !== "default" ? rule.tenant_id : "All agents"}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className="px-2 py-0.5 rounded bg-white/[0.05] text-gray-300 font-mono text-xs">
                        {formatOperator(rule.operator)} {rule.threshold}
                      </span>
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
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(rule.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
