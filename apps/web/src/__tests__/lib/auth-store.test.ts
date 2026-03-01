import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../../lib/auth-store';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('should set auth credentials', () => {
    useAuthStore.getState().setAuth('key123', 'admin', 'tenant1');
    const state = useAuthStore.getState();
    expect(state.apiKey).toBe('key123');
    expect(state.role).toBe('admin');
    expect(state.tenantId).toBe('tenant1');
  });

  it('should clear auth credentials', () => {
    useAuthStore.getState().setAuth('key', 'admin', 'tenant');
    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().apiKey).toBeNull();
    expect(useAuthStore.getState().role).toBeNull();
    expect(useAuthStore.getState().tenantId).toBeNull();
  });

  it('should return authentication status', () => {
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    useAuthStore.getState().setAuth('key', 'admin', 'tenant');
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);
  });

  it('should return auth headers with API key', () => {
    useAuthStore.getState().setAuth('key123', 'admin', 'tenant');
    expect(useAuthStore.getState().getAuthHeaders()).toEqual({
      'X-API-Key': 'key123',
    });
  });

  it('should return empty headers when not authenticated', () => {
    expect(useAuthStore.getState().getAuthHeaders()).toEqual({});
  });
});
