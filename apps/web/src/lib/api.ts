import { useAuthStore } from './auth-store';
import { useToastStore } from './toast-store';

/**
 * Authenticated fetch wrapper with automatic error toasting.
 * Attaches API key from auth store and shows toast on non-ok responses.
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const { apiKey } = useAuthStore.getState();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  };

  const res = await fetch(path, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    useToastStore.getState().addToast(body.error || `Error ${res.status}`, 'error');
  }

  return res;
}
