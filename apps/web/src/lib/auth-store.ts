import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  apiKey: string | null;
  role: string | null;
  tenantId: string | null;
  setAuth: (apiKey: string, role: string, tenantId: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  getAuthHeaders: () => Record<string, string>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      apiKey: null,
      role: null,
      tenantId: null,

      setAuth: (apiKey: string, role: string, tenantId: string) => {
        set({ apiKey, role, tenantId });
      },

      clearAuth: () => {
        set({ apiKey: null, role: null, tenantId: null });
      },

      isAuthenticated: () => {
        return get().apiKey !== null;
      },

      getAuthHeaders: (): Record<string, string> => {
        const key = get().apiKey;
        if (!key) return {};
        return { 'X-API-Key': key };
      },
    }),
    {
      name: 'vigil-auth',
      partialize: (state) => ({
        apiKey: state.apiKey,
        role: state.role,
        tenantId: state.tenantId,
      }),
    },
  ),
);
