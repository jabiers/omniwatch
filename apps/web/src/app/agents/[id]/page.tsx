"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Filter,
} from "lucide-react";

interface AgentDetail {
  id: string;
  name: string;
  type: string;
  status: string;
  prompt?: string;
  createdAt?: string;
  metrics?: {
    runCount: number;
    successRate: number;
    avgDuration: number;
  };
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

const logLevelColor: Record<string, string> = {
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
  debug: "text-gray-500",
};

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const [agentRes, logsRes] = await Promise.allSettled([
          fetch(`/api/agents/${id}`),
          fetch(`/api/agents/${id}/logs`),
        ]);

        if (agentRes.status === "fulfilled" && agentRes.value.ok) {
          const data = (await agentRes.value.json()) as AgentDetail;
          setAgent(data);
        }

        if (logsRes.status === "fulfilled" && logsRes.value.ok) {
          const data = (await logsRes.value.json()) as LogEntry[] | { logs: LogEntry[] };
          setLogs(Array.isArray(data) ? data : data.logs ?? []);
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  async function sendAction(action: string) {
    setActionLoading(true);
    try {
      await fetch(`/api/agents/${id}/${action}`, { method: "POST" });
      // Refresh agent state
      const res = await fetch(`/api/agents/${id}`);
      if (res.ok) setAgent((await res.json()) as AgentDetail);
    } catch {
      // handle error
    } finally {
      setActionLoading(false);
    }
  }

  const filteredLogs =
    logFilter === "all" ? logs : logs.filter((l) => l.level === logFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading...
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
    agent.status === "running"
      ? "bg-emerald-500"
      : agent.status === "error"
        ? "bg-red-500"
        : agent.status === "healing"
          ? "bg-yellow-500"
          : "bg-gray-500";

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
              {agent.createdAt && (
                <span>
                  Created {new Date(agent.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => sendAction("start")}
              disabled={actionLoading || agent.status === "running"}
              className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Start"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={() => sendAction("stop")}
              disabled={actionLoading || agent.status === "stopped"}
              className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Stop"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={() => sendAction("restart")}
              disabled={actionLoading}
              className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => sendAction("destroy")}
              disabled={actionLoading}
              className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Destroy"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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

      {/* Metrics */}
      {agent.metrics && (
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card text-center">
            <p className="text-xs text-gray-500 mb-1">Run Count</p>
            <p className="text-2xl font-bold">{agent.metrics.runCount}</p>
          </div>
          <div className="glass-card text-center">
            <p className="text-xs text-gray-500 mb-1">Success Rate</p>
            <p className="text-2xl font-bold">
              {(agent.metrics.successRate * 100).toFixed(1)}%
            </p>
          </div>
          <div className="glass-card text-center">
            <p className="text-xs text-gray-500 mb-1">Avg Duration</p>
            <p className="text-2xl font-bold">
              {(agent.metrics.avgDuration / 1000).toFixed(1)}s
            </p>
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="glass-card !p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
          <h2 className="text-sm font-medium">Logs</h2>
          <div className="flex items-center gap-2">
            <Filter className="w-3 h-3 text-gray-500" />
            {["all", "info", "warn", "error", "debug"].map((level) => (
              <button
                key={level}
                onClick={() => setLogFilter(level)}
                className={`px-2 py-0.5 rounded text-xs capitalize transition-colors ${
                  logFilter === level
                    ? "bg-white/[0.1] text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto p-4 space-y-0.5">
          {filteredLogs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No logs available.
            </p>
          ) : (
            filteredLogs.map((log, i) => (
              <div key={i} className="log-line flex gap-3">
                <span className="text-gray-600 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={`w-12 shrink-0 uppercase ${logLevelColor[log.level] ?? "text-gray-500"}`}
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
    </div>
  );
}
