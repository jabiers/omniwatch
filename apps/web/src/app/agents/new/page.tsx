'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Eye, Loader2, Code, Rocket } from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { useToastStore } from '../../../lib/toast-store';

const agentTypes = [
  {
    value: 'watcher',
    label: 'Watcher',
    desc: 'Monitors conditions and sends alerts',
    icon: '👁',
  },
  {
    value: 'doer',
    label: 'Doer',
    desc: 'Executes actions when triggered',
    icon: '⚡',
  },
  {
    value: 'auto',
    label: 'Auto',
    desc: 'AI decides the best agent type',
    icon: '🤖',
  },
];

interface PreviewResult {
  code: string;
  type?: string;
  name?: string;
}

export default function NewAgentPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [prompt, setPrompt] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('auto');
  const [once, setOnce] = useState(false);
  const [schedule, setSchedule] = useState('');

  // Preview state
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewError, setPreviewError] = useState('');

  // Create state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  /** Preview generated code before creating */
  async function handlePreview() {
    if (!prompt.trim()) return;

    setPreviewing(true);
    setPreviewError('');
    setPreview(null);

    try {
      const body: Record<string, unknown> = {
        prompt: prompt.trim(),
      };
      if (type !== 'auto') body.template = type;

      const res = await apiFetch('/api/agents/preview', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? `Preview failed (${res.status})`);
      }

      const data = (await res.json()) as {
        result?: { code?: string; generatedCode?: string; type?: string; name?: string };
        code?: string;
        generatedCode?: string;
        type?: string;
        name?: string;
      };
      const r = data.result ?? data;
      setPreview({
        code: r.code ?? r.generatedCode ?? '',
        type: r.type,
        name: r.name,
      });
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Failed to preview');
    } finally {
      setPreviewing(false);
    }
  }

  /** Create the agent */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const body: Record<string, unknown> = {
        prompt: prompt.trim(),
        type,
      };
      if (name.trim()) body.name = name.trim();
      if (once) body.once = true;
      if (schedule.trim()) body.schedule = schedule.trim();

      const res = await apiFetch('/api/agents', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? `Failed (${res.status})`);
      }

      const data = (await res.json()) as { id?: string };
      addToast('Agent created successfully', 'success');
      router.push(`/agents/${data.id ?? ''}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
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
        <p className="text-sm text-gray-500">Describe what you want in natural language.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prompt */}
        <div className="glass-card !p-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.08]">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <label htmlFor="agent-prompt" className="text-sm text-gray-400">
              Prompt
            </label>
          </div>
          <textarea
            id="agent-prompt"
            value={prompt}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
            placeholder="쿠팡에서 에어팟 프로 25만원 이하면 알려줘"
            className="w-full bg-transparent px-4 py-4 text-sm resize-none h-32 focus:outline-none placeholder:text-gray-600"
          />
        </div>

        {/* Agent Name (Optional) */}
        <div>
          <label htmlFor="agent-name" className="text-sm text-gray-400 mb-1 block">
            Name <span className="text-gray-600">(optional)</span>
          </label>
          <input
            id="agent-name"
            type="text"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder="my-price-watcher"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50 placeholder:text-gray-600"
          />
        </div>

        {/* Agent Type */}
        <div>
          <span id="agent-type-label" className="text-sm text-gray-400 mb-2 block">
            Agent Type
          </span>
          <div
            className="grid grid-cols-3 gap-3"
            role="radiogroup"
            aria-labelledby="agent-type-label"
          >
            {agentTypes.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={type === t.value}
                onClick={() => setType(t.value)}
                className={`glass-card !p-3 text-left transition-colors ${
                  type === t.value
                    ? '!border-emerald-500/50 bg-emerald-500/5'
                    : 'hover:bg-white/[0.05]'
                }`}
              >
                <p className="text-sm font-medium mb-0.5">
                  <span className="mr-1.5">{t.icon}</span>
                  {t.label}
                </p>
                <p className="text-xs text-gray-500">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="glass-card space-y-4">
          <h3 className="text-sm font-medium text-gray-400">Options</h3>

          <label htmlFor="agent-once" className="flex items-center gap-3 cursor-pointer">
            <input
              id="agent-once"
              type="checkbox"
              checked={once}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOnce(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 accent-emerald-500"
            />
            <div>
              <p className="text-sm">Run once (--once)</p>
              <p className="text-xs text-gray-500">Execute a single time and stop</p>
            </div>
          </label>

          <div>
            <label htmlFor="agent-schedule" className="text-sm mb-1 block">
              Schedule (--schedule)
            </label>
            <input
              id="agent-schedule"
              type="text"
              value={schedule}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedule(e.target.value)}
              placeholder="e.g. */30 * * * * (every 30 min)"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50 placeholder:text-gray-600"
            />
          </div>
        </div>

        {/* Preview Button */}
        <button
          type="button"
          onClick={handlePreview}
          disabled={previewing || !prompt.trim()}
          className="w-full py-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-gray-300 font-medium hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {previewing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Preview...
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Preview Code
            </>
          )}
        </button>

        {/* Preview Error */}
        {previewError && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {previewError}
          </div>
        )}

        {/* Preview Result */}
        {preview && (
          <div className="glass-card !p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
              <span className="flex items-center gap-2 text-sm text-gray-400">
                <Code className="w-4 h-4" />
                Generated Code
                {preview.type && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 capitalize">
                    {preview.type}
                  </span>
                )}
              </span>
              {preview.name && <span className="text-xs text-gray-500">{preview.name}</span>}
            </div>
            <pre className="p-4 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto">
              <code className="text-gray-300">{preview.code}</code>
            </pre>
          </div>
        )}

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
          className="w-full py-3 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              Create Agent
            </>
          )}
        </button>
      </form>
    </div>
  );
}
