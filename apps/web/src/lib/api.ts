import { useAuthStore } from './auth-store';
import { useToastStore } from './toast-store';

/**
 * Authenticated fetch wrapper with automatic error toasting.
 * Attaches Bearer token from auth store and shows toast on non-ok responses.
 * Includes a 15-second timeout via AbortController.
 * Auto-redirects to login on 401 (expired/invalid session).
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const { token } = useAuthStore.getState();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(path, { ...options, headers, signal: controller.signal });
    clearTimeout(timeout);

    // Session expired or invalid — auto-logout and redirect
    if (res.status === 401 && token && !path.includes('/auth/')) {
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return res;
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({ error: 'Request failed' }))) as Record<
        string,
        string
      >;
      useToastStore.getState().addToast(body.error || `Error ${res.status}`, 'error');
    }

    return res;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === 'AbortError') {
      useToastStore.getState().addToast('Request timed out', 'error');
    }
    throw err;
  }
}
