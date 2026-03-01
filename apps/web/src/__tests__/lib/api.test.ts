import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('apiFetch', () => {
  beforeEach(async () => {
    mockFetch.mockReset();
    // Import fresh each time to ensure clean state
    const { useAuthStore } = await import('../../lib/auth-store');
    const { useToastStore } = await import('../../lib/toast-store');
    useAuthStore.getState().clearAuth();
    useToastStore.setState({ toasts: [] });
  });

  it('should attach Bearer token header when authenticated', async () => {
    const { useAuthStore } = await import('../../lib/auth-store');
    useAuthStore.getState().setAuth('test-token', 'admin', 'tenant');
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    const { apiFetch } = await import('../../lib/api');
    await apiFetch('/api/agents');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/agents',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('should include Content-Type header', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    const { apiFetch } = await import('../../lib/api');
    await apiFetch('/api/test');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('should show toast on error response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server Error' }),
    });

    const { apiFetch } = await import('../../lib/api');
    await apiFetch('/api/fail');

    // apiFetch uses the same toast store instance via its own import
    const { useToastStore } = await import('../../lib/toast-store');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].message).toBe('Server Error');
  });

  it('should show fallback toast when json parsing fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('parse error')),
    });

    const { apiFetch } = await import('../../lib/api');
    await apiFetch('/api/fail');

    const { useToastStore } = await import('../../lib/toast-store');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].message).toBe('Request failed');
  });
});
