"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

const agentTypes = [
  {
    value: "watcher",
    label: "Watcher",
    desc: "Monitors conditions and sends alerts",
  },
  {
    value: "doer",
    label: "Doer",
    desc: "Executes actions when triggered",
  },
  {
    value: "auto",
    label: "Auto",
    desc: "AI decides the best agent type",
  },
];

export default function NewAgentPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState("auto");
  const [once, setOnce] = useState(false);
  const [schedule, setSchedule] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const body: Record<string, unknown> = {
        prompt: prompt.trim(),
        type,
      };
      if (once) body.once = true;
      if (schedule.trim()) body.schedule = schedule.trim();

      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? `Failed (${res.status})`);
      }

      const data = await res.json();
      router.push(`/agents/${data.id ?? ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/agents"
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Agents
      </Link>

      <div>
        <h1 className="text-2xl font-semibold mb-1">Create Agent</h1>
        <p className="text-sm text-gray-500">
          Describe what you want in natural language.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prompt */}
        <div className="glass-card !p-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.08]">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-gray-400">Prompt</span>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="쿠팡에서 에어팟 프로 25만원 이하면 알려줘"
            className="w-full bg-transparent px-4 py-4 text-sm resize-none h-32 focus:outline-none placeholder:text-gray-600"
          />
        </div>

        {/* Agent Type */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">
            Agent Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {agentTypes.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`glass-card !p-3 text-left transition-colors ${
                  type === t.value
                    ? "!border-emerald-500/50 bg-emerald-500/5"
                    : "hover:bg-white/[0.05]"
                }`}
              >
                <p className="text-sm font-medium mb-0.5">{t.label}</p>
                <p className="text-xs text-gray-500">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="glass-card space-y-4">
          <h3 className="text-sm font-medium text-gray-400">Options</h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={once}
              onChange={(e) => setOnce(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 accent-emerald-500"
            />
            <div>
              <p className="text-sm">Run once (--once)</p>
              <p className="text-xs text-gray-500">
                Execute a single time and stop
              </p>
            </div>
          </label>

          <div>
            <label className="text-sm mb-1 block">
              Schedule (--schedule)
            </label>
            <input
              type="text"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="e.g. */30 * * * * (every 30 min)"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50 placeholder:text-gray-600"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !prompt.trim()}
          className="w-full py-3 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Creating..." : "Create Agent"}
        </button>
      </form>
    </div>
  );
}
