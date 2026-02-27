"use client";

import { useState, useEffect } from "react";
import {
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

/** Shape matches the actual API response (snake_case) */
interface ApiConfig {
  ai?: {
    provider?: string;
    api_key?: string;
    model?: string;
  };
  notification?: {
    webhook_url?: string;
    system?: boolean;
    slack_webhook?: string;
    discord_webhook?: string;
    telegram_token?: string;
    telegram_chat_id?: string;
    channels?: Record<string, unknown>;
  };
  agent?: {
    max_count?: number;
    memory_limit_mb?: number;
    max_heal_attempts?: number;
  };
}

const providerGroups = [
  {
    label: "Anthropic (Claude)",
    models: [
      { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
      { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
      { value: "claude-haiku-3-5-20241022", label: "Claude Haiku 3.5" },
    ],
  },
  {
    label: "OpenAI",
    models: [
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "o3-mini", label: "o3-mini" },
    ],
  },
  {
    label: "Google",
    models: [
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    ],
  },
];

export default function SettingsPage() {
  // AI config
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("claude-sonnet-4-20250514");
  const [showKey, setShowKey] = useState(false);

  // Notification config
  const [slackWebhook, setSlackWebhook] = useState("");
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [systemNotifications, setSystemNotifications] = useState(true);

  // Agent config
  const [maxAgents, setMaxAgents] = useState(10);
  const [memoryLimit, setMemoryLimit] = useState(256);
  const [maxHealAttempts, setMaxHealAttempts] = useState(3);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load config on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          const cfg: ApiConfig = data.config ?? data;

          // AI
          setAiApiKey(cfg.ai?.api_key ?? "");
          setAiModel(cfg.ai?.model ?? "claude-sonnet-4-20250514");

          // Notifications
          setSlackWebhook(cfg.notification?.slack_webhook ?? "");
          setDiscordWebhook(cfg.notification?.discord_webhook ?? "");
          setTelegramToken(cfg.notification?.telegram_token ?? "");
          setTelegramChatId(cfg.notification?.telegram_chat_id ?? "");
          setSystemNotifications(cfg.notification?.system ?? true);

          // Agent
          setMaxAgents(cfg.agent?.max_count ?? 20);
          setMemoryLimit(cfg.agent?.memory_limit_mb ?? 128);
          setMaxHealAttempts(cfg.agent?.max_heal_attempts ?? 3);
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /** Show toast and auto-dismiss */
  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  /** Save config via PUT /api/config */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Detect provider from model name
    const detectProvider = (m: string) => {
      if (m.startsWith("gpt-") || m.startsWith("o1") || m.startsWith("o3")) return "openai";
      if (m.startsWith("gemini-")) return "google";
      return "anthropic";
    };

    const config: ApiConfig = {
      ai: {
        provider: detectProvider(aiModel),
        api_key: aiApiKey || undefined,
        model: aiModel,
      },
      notification: {
        slack_webhook: slackWebhook || undefined,
        discord_webhook: discordWebhook || undefined,
        telegram_token: telegramToken || undefined,
        telegram_chat_id: telegramChatId || undefined,
        system: systemNotifications,
      },
      agent: {
        max_count: maxAgents,
        memory_limit_mb: memoryLimit,
        max_heal_attempts: maxHealAttempts,
      },
    };

    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      if (res.ok) {
        showToast("success", "Settings saved successfully.");
      } else {
        const data = await res.json().catch(() => ({}));
        showToast("error", data.message ?? `Failed to save (${res.status})`);
      }
    } catch {
      showToast("error", "Failed to save. API may be unavailable.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Toast notification */}
      {toast && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm transition-all ${
            toast.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* AI Configuration */}
        <div className="glass-card space-y-4">
          <h2 className="text-lg font-medium">AI Configuration</h2>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-3 py-2 pr-10 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm font-mono focus:outline-none focus:border-emerald-500/50 placeholder:text-gray-600"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Masked values from the server indicate the key is already set.
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              AI Model
            </label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50"
            >
              {providerGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.models.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-gray-600 mt-1">
              Currently only Anthropic models are supported. Other providers coming soon.
            </p>
          </div>
        </div>

        {/* Notification Channels */}
        <div className="glass-card space-y-4">
          <h2 className="text-lg font-medium">Notification Channels</h2>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              Slack Webhook URL
            </label>
            <input
              type="url"
              value={slackWebhook}
              onChange={(e) => setSlackWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50 placeholder:text-gray-600"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              Discord Webhook URL
            </label>
            <input
              type="url"
              value={discordWebhook}
              onChange={(e) => setDiscordWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50 placeholder:text-gray-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                Telegram Bot Token
              </label>
              <input
                type="password"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                placeholder="123456:ABC..."
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm font-mono focus:outline-none focus:border-emerald-500/50 placeholder:text-gray-600"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                Telegram Chat ID
              </label>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="-100123456789"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm font-mono focus:outline-none focus:border-emerald-500/50 placeholder:text-gray-600"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={systemNotifications}
              onChange={(e) => setSystemNotifications(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 accent-emerald-500"
            />
            <div>
              <p className="text-sm">System Notifications</p>
              <p className="text-xs text-gray-500">
                Show desktop/OS notifications for alerts
              </p>
            </div>
          </label>
        </div>

        {/* Agent Configuration */}
        <div className="glass-card space-y-4">
          <h2 className="text-lg font-medium">Agent Configuration</h2>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              Max Agents
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxAgents}
              onChange={(e) => setMaxAgents(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50"
            />
            <p className="text-xs text-gray-600 mt-1">
              Maximum number of agents allowed to run concurrently.
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              Memory Limit (MB)
            </label>
            <input
              type="number"
              min={64}
              max={2048}
              step={64}
              value={memoryLimit}
              onChange={(e) => setMemoryLimit(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50"
            />
            <p className="text-xs text-gray-600 mt-1">
              Memory limit per agent process in megabytes.
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              Max Heal Attempts
            </label>
            <input
              type="number"
              min={0}
              max={10}
              value={maxHealAttempts}
              onChange={(e) => setMaxHealAttempts(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50"
            />
            <p className="text-xs text-gray-600 mt-1">
              Number of times to attempt auto-healing before stopping an errored
              agent.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </form>
    </div>
  );
}
