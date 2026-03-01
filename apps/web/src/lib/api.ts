import { useAuthStore } from './auth-store';
import { useToastStore } from './toast-store';

/**
 * Authenticated fetch wrapper with automatic error toasting.
 * Attaches API key from auth store and shows toast on non-ok responses.
 * Includes a 15-second timeout via AbortController.
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const { apiKey } = useAuthStore.getState();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(path, { ...options, headers, signal: controller.signal });
    clearTimeout(timeout);

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
