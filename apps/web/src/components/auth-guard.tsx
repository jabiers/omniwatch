"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "../lib/auth-store";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Wait for zustand persist rehydration
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      if (!useAuthStore.getState().isAuthenticated()) {
        router.replace("/login");
      } else {
        setChecked(true);
      }
    });

    // If already hydrated (e.g., subsequent renders)
    if (useAuthStore.persist.hasHydrated()) {
      if (!isAuthenticated()) {
        router.replace("/login");
      } else {
        setChecked(true);
      }
    }

    return () => {
      unsub();
    };
  }, [isAuthenticated, router]);

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
