"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Filter } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  lastRun?: string;
  createdAt?: string;
}

const statusConfig: Record<string, { dot: string; text: string }> = {
  running: { dot: "bg-emerald-500", text: "text-emerald-400" },
  stopped: { dot: "bg-gray-500", text: "text-gray-400" },
  error: { dot: "bg-red-500", text: "text-red-400" },
  healing: { dot: "bg-yellow-500", text: "text-yellow-400" },
};

const statusOptions = ["all", "running", "stopped", "error", "healing"];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/agents");
        if (res.ok) {
          const data = await res.json();
          setAgents(Array.isArray(data) ? data : data.agents ?? []);
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered =
    filter === "all" ? agents : agents.filter((a) => a.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Agents</h1>
        <Link
          href="/agents/new"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Agent
        </Link>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <div className="flex gap-1">
          {statusOptions.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-md text-xs capitalize transition-colors ${
                filter === s
                  ? "bg-white/[0.1] text-white"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card !p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">
                Name
              </th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">
                Type
              </th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">
                Status
              </th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">
                Last Run
              </th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-sm text-gray-500 py-8"
                >
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-sm text-gray-500 py-8"
                >
                  No agents found.
                </td>
              </tr>
            ) : (
              filtered.map((agent) => {
                const sc = statusConfig[agent.status] ?? statusConfig.stopped;
                return (
                  <tr
                    key={agent.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-3">
                      <Link
                        href={`/agents/${agent.id}`}
                        className="text-sm hover:text-emerald-400 transition-colors"
                      >
                        {agent.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-400 capitalize">
                      {agent.type}
                    </td>
                    <td className="px-6 py-3">
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${sc.dot}`}
                        />
                        <span className={`text-sm capitalize ${sc.text}`}>
                          {agent.status}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {agent.lastRun
                        ? new Date(agent.lastRun).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        href={`/agents/${agent.id}`}
                        className="text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
