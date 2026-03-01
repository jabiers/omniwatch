/** HTTP API client — replaces Unix Socket IPC client (v2.2) */
import { loadConfig } from '@omniwatch/db';

const DEFAULT_API_URL = 'http://localhost:3456';

function getApiUrl(): string {
  try {
    const config = loadConfig() as unknown as Record<string, Record<string, string>>;
    return config.api?.url || DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
}

function getApiKey(): string | undefined {
  try {
    const config = loadConfig() as unknown as Record<string, Record<string, string>>;
    return config.api?.api_key;
  } catch {
    return undefined;
  }
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiKey = getApiKey();
  if (apiKey) headers['X-API-Key'] = apiKey;
  return headers;
}

/** Check if the API server is reachable */
export async function isServerRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiUrl()}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Generic fetch wrapper with error handling */
async function apiFetch<T>(path: string, options: RequestInit = {}, timeout = 30_000): Promise<T> {
  const url = `${getApiUrl()}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...buildHeaders(), ...(options.headers as Record<string, string>) },
    signal: AbortSignal.timeout(timeout),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── Agent operations ──────────────────────────────────────────────

export async function listAgents(params?: { status?: string }) {
  const qs = params?.status ? `?status=${params.status}` : '';
  const data = await apiFetch<{ agents: unknown[] }>(`/api/agents${qs}`);
  return data.agents;
}

export async function getAgent(id: string) {
  const data = await apiFetch<{ agent: unknown }>(`/api/agents/${id}`);
  return data.agent;
}

export async function createAgent(params: Record<string, unknown>, timeout = 120_000) {
  const data = await apiFetch<{ agent: unknown }>(
    '/api/agents',
    { method: 'POST', body: JSON.stringify(params) },
    timeout,
  );
  return data.agent;
}

export async function destroyAgent(id: string) {
  const data = await apiFetch<{ result: unknown }>(`/api/agents/${id}`, {
    method: 'DELETE',
  });
  return data.result;
}

export async function startAgent(id: string) {
  const data = await apiFetch<{ result: unknown }>(`/api/agents/${id}/start`, {
    method: 'POST',
  });
  return data.result;
}

export async function stopAgent(id: string) {
  const data = await apiFetch<{ result: unknown }>(`/api/agents/${id}/stop`, {
    method: 'POST',
  });
  return data.result;
}

export async function restartAgent(id: string) {
  const data = await apiFetch<{ result: unknown }>(`/api/agents/${id}/restart`, {
    method: 'POST',
  });
  return data.result;
}

// ── Logs ──────────────────────────────────────────────────────────

export async function getAgentLogs(id: string, params?: { limit?: number; level?: string }) {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.level) qs.set('level', params.level);
  const query = qs.toString() ? `?${qs}` : '';
  const data = await apiFetch<{ logs: unknown[] }>(`/api/agents/${id}/logs${query}`);
  return data.logs;
}

// ── Chat / Preview / Apply ────────────────────────────────────────

export async function previewAgent(
  params: { prompt: string; template?: string },
  timeout = 120_000,
) {
  const data = await apiFetch<{ result: unknown }>(
    '/api/agents/preview',
    { method: 'POST', body: JSON.stringify(params) },
    timeout,
  );
  return data.result;
}

export async function chatWithAgent(id: string, message: string, timeout = 30_000) {
  const data = await apiFetch<{ result: unknown }>(
    `/api/agents/${id}/chat`,
    { method: 'POST', body: JSON.stringify({ message }) },
    timeout,
  );
  return data.result;
}

export async function applyCode(id: string, code: string) {
  const data = await apiFetch<{ result: unknown }>(`/api/agents/${id}/apply`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  return data.result;
}

// ── System ────────────────────────────────────────────────────────

export async function getSystemStatus() {
  return apiFetch<Record<string, unknown>>('/api/system/status');
}

export async function getHealthDetailed() {
  return apiFetch<Record<string, unknown>>('/api/system/health/detailed');
}
