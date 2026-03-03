import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthGuard } from '../../components/auth-guard';
import { useAuthStore } from '../../lib/auth-store';

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

// Mock global fetch for /api/auth/me validation
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('AuthGuard', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockFetch.mockReset();
    // Default: /api/auth/me returns 200
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
  });

  it('should show loading state initially when not hydrated', () => {
    useAuthStore.setState({ token: null, role: null, tenantId: null });
    const origHasHydrated = useAuthStore.persist.hasHydrated;
    useAuthStore.persist.hasHydrated = () => false;

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();

    useAuthStore.persist.hasHydrated = origHasHydrated;
  });

  it('should render children when authenticated', async () => {
    useAuthStore.setState({ token: 'test-token-123', role: 'admin', tenantId: 'default' });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    );
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('should redirect to login when not authenticated', () => {
    useAuthStore.setState({ token: null, role: null, tenantId: null });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    );
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('should redirect to login when server session is expired', async () => {
    useAuthStore.setState({ token: 'expired-token', role: 'admin', tenantId: 'default' });
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    );
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });
});
