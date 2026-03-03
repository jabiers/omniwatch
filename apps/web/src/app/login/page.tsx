'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  KeyRound,
  Loader2,
  AlertCircle,
  Zap,
  Eye,
  EyeOff,
  Shield,
  Github,
} from 'lucide-react';
import { useAuthStore } from '../../lib/auth-store';

type LoginMode = 'quick' | 'apikey';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<LoginMode>('quick');
  const [quickLoading, setQuickLoading] = useState(false);

  // Redirect if already authenticated (after hydration)
  useEffect(() => {
    function check() {
      if (useAuthStore.getState().isAuthenticated()) {
        router.replace('/');
      }
    }
    if (useAuthStore.persist.hasHydrated()) {
      check();
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(check);
      return () => unsub();
    }
  }, [router]);

  /** Quick Access — auto-login from localhost as admin */
  async function handleQuickAccess() {
    setQuickLoading(true);
    setError('');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch('/api/auth/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = (await res.json()) as {
          token: string;
          user: { id: string; email: string; role: string; tenant_id: string };
        };
        setAuth(data.token, data.user.role, data.user.tenant_id);
        router.replace('/');
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || 'Quick access failed. Try API key login.');
        setMode('apikey');
      }
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Connection timed out.');
      } else {
        setError('Cannot connect to server. Is it running?');
      }
    } finally {
      setQuickLoading(false);
    }
  }

  /** API Key login */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    setLoading(true);
    setError('');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = (await res.json()) as {
          token: string;
          user: { id: string; email: string; role: string; tenant_id: string };
        };
        setAuth(data.token, data.user.role, data.user.tenant_id);
        router.replace('/');
      } else if (res.status === 401 || res.status === 403) {
        setError('Invalid API key.');
      } else {
        setError(`Server error (${res.status})`);
      }
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Connection timed out.');
      } else {
        setError('Cannot connect to server.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#07070b] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/[0.07] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/[0.05] rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-[150px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo + Branding */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center backdrop-blur-sm">
              <Activity className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-emerald-500/10 blur-lg -z-10" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">OmniWatch</h1>
          <p className="text-sm text-gray-500 mt-1.5">AI-Powered Autonomous Monitoring</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
          {/* Quick Access (Primary) */}
          {mode === 'quick' && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-lg font-semibold text-white">Welcome back</h2>
                <p className="text-xs text-gray-500 mt-1">Access your monitoring dashboard</p>
              </div>

              <button
                onClick={handleQuickAccess}
                disabled={quickLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20"
              >
                {quickLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Quick Access
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.06]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-[10px] uppercase tracking-widest text-gray-600 bg-[#0b0b12]">
                    or
                  </span>
                </div>
              </div>

              {/* Secondary options */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode('apikey')}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs text-gray-400 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:text-gray-300 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  API Key
                </button>
                <button
                  onClick={() => (window.location.href = '/api/auth/github')}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs text-gray-400 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:text-gray-300 transition-colors"
                >
                  <Github className="w-3.5 h-3.5" />
                  GitHub
                </button>
              </div>
            </div>
          )}

          {/* API Key Login */}
          {mode === 'apikey' && (
            <div className="space-y-4">
              <div>
                <button
                  onClick={() => {
                    setMode('quick');
                    setError('');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3 flex items-center gap-1"
                >
                  &larr; Back
                </button>
                <h2 className="text-lg font-semibold text-white">API Key Login</h2>
                <p className="text-xs text-gray-500 mt-1">For remote or programmatic access</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="apiKey"
                    className="block text-xs font-medium text-gray-400 mb-1.5"
                  >
                    API Key
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input
                      id="apiKey"
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setApiKey(e.target.value);
                        setError('');
                      }}
                      placeholder="omni_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full pl-10 pr-10 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-mono"
                      autoFocus
                      autoComplete="off"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      aria-label={showKey ? 'Hide API key' : 'Show API key'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !apiKey.trim()}
                  className="w-full py-2.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>

              <p className="text-[10px] text-gray-600 text-center">
                Generate keys via{' '}
                <code className="text-gray-500 bg-white/[0.04] px-1 py-0.5 rounded">
                  omni auth create-key
                </code>
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/15 rounded-lg px-3 py-2.5 mt-4">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-gray-700 mt-6">
          OmniWatch &middot; Don&apos;t Config, Just Speak
        </p>
      </div>
    </div>
  );
}
