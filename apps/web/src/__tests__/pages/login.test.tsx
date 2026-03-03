import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from '../../app/login/page';
import { useAuthStore } from '../../lib/auth-store';

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/login',
}));

describe('LoginPage', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    useAuthStore.setState({ token: null, role: null, tenantId: null });
  });

  it('should render branding and quick access button', () => {
    render(<LoginPage />);

    expect(screen.getByText('OmniWatch')).toBeInTheDocument();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quick Access/i })).toBeInTheDocument();
  });

  it('should show API Key and GitHub login options', () => {
    render(<LoginPage />);

    expect(screen.getByRole('button', { name: /API Key/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /GitHub/i })).toBeInTheDocument();
  });

  it('should switch to API key mode when clicking API Key button', () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /API Key/i }));

    expect(screen.getByText('API Key Login')).toBeInTheDocument();
    expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  it('should enable sign-in button when API key is entered', () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /API Key/i }));

    const input = screen.getByLabelText('API Key');
    fireEvent.change(input, { target: { value: 'omni_abc123' } });

    expect(screen.getByRole('button', { name: 'Sign in' })).not.toBeDisabled();
  });
});
