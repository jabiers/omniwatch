'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, KeyRound, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../lib/auth-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3456';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/agents`, {
        headers: { 'X-API-Key': apiKey.trim() },
      });

      if (res.ok) {
        // Consume the body to verify the response is valid JSON
        await res.json();
        // The API returns successfully - key is valid
        // Role and tenantId can be fetched from a /api/auth/me endpoint later;
        // for now we store what we know
        setAuth(apiKey.trim(), 'admin', 'default');
        router.replace('/');
      } else if (res.status === 401 || res.status === 403) {
        setError('Invalid API key. Please check and try again.');
      } else {
        setError(`Server error (${res.status}). Please try again.`);
      }
    } catch {
      setError('Cannot connect to Vigil API. Is the daemon running?');
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Vigil</h1>
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
                  placeholder="vigil_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
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
              vigil auth create-key
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
