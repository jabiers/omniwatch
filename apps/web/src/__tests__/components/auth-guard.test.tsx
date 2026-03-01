import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthGuard } from '../../components/auth-guard';
import { useAuthStore } from '../../lib/auth-store';

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

describe('AuthGuard', () => {
  beforeEach(() => {
    mockReplace.mockClear();
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

  it('should render children when authenticated', () => {
    useAuthStore.setState({ token: 'test-token-123', role: 'admin', tenantId: 'default' });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
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
});
