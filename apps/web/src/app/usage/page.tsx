"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  Cpu,
  Zap,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { apiFetch } from "../../lib/api";

interface UsageSummary {
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_requests: number;
  by_model: Record<string, { cost: number; requests: number; tokens: number }>;
  by_agent: Record<string, { cost: number; requests: number; name?: string }>;
  daily: { date: string; cost: number; requests: number }[];
}

function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Simple ASCII-style bar chart rendered with divs */
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function UsagePage() {
  const [data, setData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/usage?days=${days}`)
      .then((r) => r.json())
      .then((d) => setData(d as UsageSummary))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading usage data...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-gray-500 py-16">
        Unable to load usage data. API may be unavailable.
      </div>
    );
  }

  const models = Object.entries(data.by_model);
  const agents = Object.entries(data.by_agent);
  const maxDailyCost = Math.max(...data.daily.map((d) => d.cost), 0.001);
  const maxModelCost = Math.max(...models.map(([, m]) => m.cost), 0.001);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">AI Usage</h1>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                days === d
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-gray-500 hover:bg-white/[0.05]"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            Total Cost
          </div>
          <p className="text-2xl font-semibold text-emerald-400">
            {formatCost(data.total_cost)}
          </p>
        </div>
        <div className="glass-card">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Zap className="w-4 h-4" />
            API Calls
          </div>
          <p className="text-2xl font-semibold">{data.total_requests}</p>
        </div>
        <div className="glass-card">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            Input Tokens
          </div>
          <p className="text-2xl font-semibold">
            {formatTokens(data.total_input_tokens)}
          </p>
        </div>
        <div className="glass-card">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Cpu className="w-4 h-4" />
            Output Tokens
          </div>
          <p className="text-2xl font-semibold">
            {formatTokens(data.total_output_tokens)}
          </p>
        </div>
      </div>

      {/* Daily Cost Chart */}
      {data.daily.length > 0 && (
        <div className="glass-card">
          <h2 className="text-lg font-medium mb-4">Daily Cost</h2>
          <div className="flex items-end gap-1 h-32">
            {data.daily.map((day) => {
              const pct = maxDailyCost > 0 ? (day.cost / maxDailyCost) * 100 : 0;
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-1 group relative"
                >
                  <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    {day.date}: {formatCost(day.cost)} ({day.requests} calls)
                  </div>
                  <div
                    className="w-full rounded-t bg-emerald-500/60 hover:bg-emerald-400/80 transition-colors min-h-[2px]"
                    style={{ height: `${Math.max(pct, 1)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-600 mt-1 px-1">
            <span>{data.daily[0]?.date.slice(5)}</span>
            <span>{data.daily[data.daily.length - 1]?.date.slice(5)}</span>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* By Model */}
        <div className="glass-card">
          <h2 className="text-lg font-medium mb-3">Cost by Model</h2>
          {models.length === 0 ? (
            <p className="text-sm text-gray-500">No usage data yet.</p>
          ) : (
            <div className="space-y-3">
              {models.map(([model, info]) => (
                <div key={model}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300 font-mono text-xs">{model}</span>
                    <span className="text-gray-400">
                      {formatCost(info.cost)} · {info.requests} calls
                    </span>
                  </div>
                  <MiniBar value={info.cost} max={maxModelCost} color="bg-emerald-500" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Agent */}
        <div className="glass-card">
          <h2 className="text-lg font-medium mb-3">Cost by Agent</h2>
          {agents.length === 0 ? (
            <p className="text-sm text-gray-500">No agent-specific usage yet.</p>
          ) : (
            <div className="space-y-3">
              {agents.map(([agentId, info]) => (
                <div key={agentId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{info.name || agentId}</span>
                    <span className="text-gray-400">
                      {formatCost(info.cost)} · {info.requests} calls
                    </span>
                  </div>
                  <MiniBar
                    value={info.cost}
                    max={Math.max(...agents.map(([, a]) => a.cost), 0.001)}
                    color="bg-cyan-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ollama Savings Note */}
      {models.some(([m]) => m.startsWith("llama") || m.startsWith("mistral") || m.startsWith("qwen")) && (
        <div className="glass-card border-emerald-500/20">
          <p className="text-sm text-emerald-400">
            You&apos;re using local models via Ollama — these requests are free!
          </p>
        </div>
      )}
    </div>
  );
}
