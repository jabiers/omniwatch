'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../lib/auth-store';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const state = useAuthStore.getState();
      if (!state.isAuthenticated()) {
        router.replace('/login');
        return;
      }

      // Server-side session validation — verify token is still valid
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${state.token}` },
        });
        if (!res.ok) {
          // Session expired or revoked on server
          state.clearAuth();
          router.replace('/login');
          return;
        }
      } catch {
        // Network error — allow offline access with local token
      }

      setChecked(true);
    }

    // Already hydrated (most common case on subsequent renders)
    if (useAuthStore.persist.hasHydrated()) {
      checkAuth();
      return;
    }

    // Wait for zustand persist rehydration
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      checkAuth();
    });

    return () => {
      unsub();
    };
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          <span className="text-sm text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
