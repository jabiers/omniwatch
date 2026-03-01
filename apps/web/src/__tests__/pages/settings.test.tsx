import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsPage from '../../app/settings/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/settings',
}));

// Mock apiFetch to return config data immediately
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        ai: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', api_key: '' },
        notification: { system: true },
        agent: { max_count: 10, memory_limit_mb: 256, max_heal_attempts: 3 },
      }),
  }),
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the settings heading after loading', async () => {
    render(<SettingsPage />);

    const heading = await screen.findByText('Settings');
    expect(heading).toBeInTheDocument();
  });

  it('should render AI Configuration, Notification Channels, and Agent Configuration sections', async () => {
    render(<SettingsPage />);

    expect(await screen.findByText('AI Configuration')).toBeInTheDocument();
    expect(screen.getByText('Notification Channels')).toBeInTheDocument();
    expect(screen.getByText('Agent Configuration')).toBeInTheDocument();
  });

  it('should render the Appearance section with theme toggle', async () => {
    render(<SettingsPage />);

    expect(await screen.findByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
  });

  it('should render the Save Settings button', async () => {
    render(<SettingsPage />);

    const saveButton = await screen.findByRole('button', { name: /Save Settings/i });
    expect(saveButton).toBeInTheDocument();
  });
});
