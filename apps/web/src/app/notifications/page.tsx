"use client";

import { useEffect, useState } from "react";
import { Filter } from "lucide-react";

interface Notification {
  id: string;
  agentId: string;
  agentName?: string;
  severity: string;
  message: string;
  createdAt: string;
}

const severityConfig: Record<string, { dot: string; text: string; bg: string }> = {
  critical: {
    dot: "bg-red-500",
    text: "text-red-400",
    bg: "bg-red-500/10",
  },
  warning: {
    dot: "bg-yellow-500",
    text: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  info: {
    dot: "bg-blue-500",
    text: "text-blue-400",
    bg: "bg-blue-500/10",
  },
};

const severityOptions = ["all", "critical", "warning", "info"];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterAgent, setFilterAgent] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setNotifications(
            Array.isArray(data) ? data : data.notifications ?? []
          );
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Get unique agent names for filter
  const agentNames = Array.from(
    new Set(notifications.map((n) => n.agentName ?? n.agentId))
  );

  const filtered = notifications.filter((n) => {
    if (filterSeverity !== "all" && n.severity !== filterSeverity) return false;
    if (
      filterAgent !== "all" &&
      (n.agentName ?? n.agentId) !== filterAgent
    )
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Notifications</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-500">Severity:</span>
          <div className="flex gap-1">
            {severityOptions.map((s) => (
              <button
                key={s}
                onClick={() => setFilterSeverity(s)}
                className={`px-3 py-1 rounded-md text-xs capitalize transition-colors ${
                  filterSeverity === s
                    ? "bg-white/[0.1] text-white"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {agentNames.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Agent:</span>
            <select
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
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
      </div>

      {/* Table */}
      <div className="glass-card !p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">
                Severity
              </th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">
                Message
              </th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">
                Agent
              </th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-center text-sm text-gray-500 py-8"
                >
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-center text-sm text-gray-500 py-8"
                >
                  No notifications found.
                </td>
              </tr>
            ) : (
              filtered.map((n) => {
                const sc =
                  severityConfig[n.severity] ?? severityConfig.info;
                return (
                  <tr
                    key={n.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs capitalize ${sc.bg} ${sc.text}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}
                        />
                        {n.severity}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">{n.message}</td>
                    <td className="px-6 py-3 text-sm text-gray-400">
                      {n.agentName ?? n.agentId}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {new Date(n.createdAt).toLocaleString()}
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
