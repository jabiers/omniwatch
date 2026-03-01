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

  it('should render the login form with API key input and sign-in button', () => {
    render(<LoginPage />);

    expect(screen.getByText('OmniWatch')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('omni_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
    ).toBeInTheDocument();
  });

  it('should render help text about generating API keys', () => {
    render(<LoginPage />);

    expect(screen.getByText('omni auth create-key')).toBeInTheDocument();
    expect(screen.getByText('Enter your API key to access the dashboard')).toBeInTheDocument();
  });

  it('should have the sign-in button disabled when input is empty', () => {
    render(<LoginPage />);

    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    expect(submitButton).toBeDisabled();
  });

  it('should enable the sign-in button when API key is entered', () => {
    render(<LoginPage />);

    const input = screen.getByLabelText('API Key');
    fireEvent.change(input, { target: { value: 'omni_abc123' } });

    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    expect(submitButton).not.toBeDisabled();
  });
});
