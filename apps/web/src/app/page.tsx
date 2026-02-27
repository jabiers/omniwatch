"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, AlertTriangle, Play, Bell } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  lastRun?: string;
}

interface Notification {
  id: string;
  agentId: string;
  agentName?: string;
  severity: string;
  message: string;
  createdAt: string;
}

const statusColor: Record<string, string> = {
  running: "bg-emerald-500",
  stopped: "bg-gray-500",
  error: "bg-red-500",
  healing: "bg-yellow-500",
};

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [agentsRes, notifsRes] = await Promise.allSettled([
          fetch("/api/agents"),
          fetch("/api/notifications"),
        ]);

        if (agentsRes.status === "fulfilled" && agentsRes.value.ok) {
          const data = await agentsRes.value.json();
          setAgents(Array.isArray(data) ? data : data.agents ?? []);
        }

        if (notifsRes.status === "fulfilled" && notifsRes.value.ok) {
          const data = await notifsRes.value.json();
          setNotifications(
            Array.isArray(data) ? data : data.notifications ?? []
          );
        }
      } catch {
        // API might not be available yet
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const running = agents.filter((a) => a.status === "running").length;
  const errors = agents.filter((a) => a.status === "error").length;
  const todayNotifs = notifications.filter((n) => {
    const d = new Date(n.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  const stats = [
    {
      label: "Total Agents",
      value: agents.length,
      icon: Bot,
      color: "text-blue-400",
    },
    {
      label: "Running",
      value: running,
      icon: Play,
      color: "text-emerald-400",
    },
    {
      label: "Errors",
      value: errors,
      icon: AlertTriangle,
      color: "text-red-400",
    },
    {
      label: "Notifications Today",
      value: todayNotifs,
      icon: Bell,
      color: "text-yellow-400",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

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
              <div className="text-3xl font-bold">
                {loading ? "—" : stat.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Agents */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Recent Agents</h2>
            <Link
              href="/agents"
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              View all
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : agents.length === 0 ? (
            <p className="text-sm text-gray-500">
              No agents yet.{" "}
              <Link
                href="/agents/new"
                className="text-emerald-400 hover:underline"
              >
                Create one
              </Link>
            </p>
          ) : (
            <div className="space-y-2">
              {agents.slice(0, 5).map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.05] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${statusColor[agent.status] ?? "bg-gray-500"}`}
                    />
                    <span className="text-sm">{agent.name}</span>
                  </div>
                  <span className="text-xs text-gray-500 capitalize">
                    {agent.type}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Notifications */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Recent Notifications</h2>
            <Link
              href="/notifications"
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              View all
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-gray-500">No notifications yet.</p>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 5).map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 py-2 px-3 rounded-lg"
                >
                  <SeverityDot severity={n.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{n.message}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {n.agentName ?? n.agentId} &middot;{" "}
                      {new Date(n.createdAt).toLocaleTimeString()}
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

function SeverityDot({ severity }: { severity: string }) {
  const color =
    severity === "critical"
      ? "bg-red-500"
      : severity === "warning"
        ? "bg-yellow-500"
        : "bg-blue-500";
  return <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${color}`} />;
}
