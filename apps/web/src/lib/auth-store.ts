import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  role: string | null;
  tenantId: string | null;
  setAuth: (token: string, role: string, tenantId: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  getAuthHeaders: () => Record<string, string>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      role: null,
      tenantId: null,

      setAuth: (token: string, role: string, tenantId: string) => {
        set({ token, role, tenantId });
      },

      clearAuth: () => {
        set({ token: null, role: null, tenantId: null });
      },

      isAuthenticated: () => {
        return get().token !== null;
      },

      getAuthHeaders: (): Record<string, string> => {
        const t = get().token;
        if (!t) return {};
        return { Authorization: 'Bearer ' + t };
      },
    }),
    {
      name: 'omniwatch-auth',
      partialize: (state) => ({
        token: state.token,
        role: state.role,
        tenantId: state.tenantId,
      }),
    },
  ),
);
