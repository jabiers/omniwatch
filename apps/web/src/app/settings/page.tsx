"use client";

import { useState, useEffect } from "react";
import { Save, Eye, EyeOff } from "lucide-react";

interface Config {
  aiApiKey: string;
  aiModel: string;
  notificationChannels: {
    slack?: string;
    discord?: string;
    email?: string;
  };
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Config>({
    aiApiKey: "",
    aiModel: "claude-sonnet-4-20250514",
    notificationChannels: {},
  });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          setConfig({
            aiApiKey: data.aiApiKey ?? "",
            aiModel: data.aiModel ?? "claude-sonnet-4-20250514",
            notificationChannels: data.notificationChannels ?? {},
          });
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  }

  function updateChannel(key: string, value: string) {
    setConfig((prev) => ({
      ...prev,
      notificationChannels: {
        ...prev.notificationChannels,
        [key]: value,
      },
    }));
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
                value={config.aiApiKey}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, aiApiKey: e.target.value }))
                }
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
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              AI Model
            </label>
            <select
              value={config.aiModel}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, aiModel: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50"
            >
              <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
              <option value="claude-opus-4-20250514">Claude Opus 4</option>
              <option value="claude-haiku-3-5-20241022">Claude Haiku 3.5</option>
            </select>
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
              value={config.notificationChannels.slack ?? ""}
              onChange={(e) => updateChannel("slack", e.target.value)}
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
              value={config.notificationChannels.discord ?? ""}
              onChange={(e) => updateChannel("discord", e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50 placeholder:text-gray-600"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              Email Address
            </label>
            <input
              type="email"
              value={config.notificationChannels.email ?? ""}
              onChange={(e) => updateChannel("email", e.target.value)}
              placeholder="alerts@example.com"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50 placeholder:text-gray-600"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
