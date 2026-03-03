'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, KeyRound, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../lib/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        setError('Invalid API key. Please check and try again.');
      } else {
        setError(`Server error (${res.status}). Please try again.`);
      }
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Connection timed out. Please try again.');
      } else {
        setError('Cannot connect to OmniWatch API. Is the server running?');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4">
            <Activity className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">OmniWatch</h1>
          <p className="text-sm text-gray-500 mt-1">AI-Powered Autonomous Monitoring</p>
        </div>

        {/* Login Card */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Sign in</h2>
          <p className="text-sm text-gray-400 mb-6">Enter your API key to access the dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* API Key Input */}
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-2">
                API Key
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setApiKey(e.target.value);
                    setError('');
                  }}
                  placeholder="omni_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
                  autoFocus
                  autoComplete="off"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !apiKey.trim()}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
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

          {/* Help text */}
          <p className="text-xs text-gray-500 mt-4 text-center">
            API keys can be generated via{' '}
            <code className="text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
              omni auth create-key
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
