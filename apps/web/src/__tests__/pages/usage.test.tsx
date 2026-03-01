import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import UsagePage from '../../app/usage/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/usage',
}));

// Mock apiFetch — return sample usage data
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        total_cost: 12.5,
        total_input_tokens: 150000,
        total_output_tokens: 45000,
        total_requests: 320,
        by_model: {
          'claude-sonnet-4-20250514': { cost: 10.0, requests: 250, tokens: 180000 },
          'gpt-4o': { cost: 2.5, requests: 70, tokens: 15000 },
        },
        by_agent: {
          agent1: { cost: 8.0, requests: 200, name: 'API Monitor' },
          agent2: { cost: 4.5, requests: 120, name: 'Log Watcher' },
        },
        daily: [
          { date: '2026-02-28', cost: 0.5, requests: 10 },
          { date: '2026-03-01', cost: 1.2, requests: 25 },
        ],
      }),
  }),
}));

describe('UsagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the AI Usage heading and period toggle buttons', async () => {
    render(<UsagePage />);

    expect(await screen.findByText('AI Usage')).toBeInTheDocument();
    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
    expect(screen.getByText('90d')).toBeInTheDocument();
  });

  it('should render usage stats cards', async () => {
    render(<UsagePage />);

    expect(await screen.findByText('Total Cost')).toBeInTheDocument();
    expect(screen.getByText('API Calls')).toBeInTheDocument();
    expect(screen.getByText('Input Tokens')).toBeInTheDocument();
    expect(screen.getByText('Output Tokens')).toBeInTheDocument();
  });

  it('should render cost breakdown sections', async () => {
    render(<UsagePage />);

    expect(await screen.findByText('Cost by Model')).toBeInTheDocument();
    expect(screen.getByText('Cost by Agent')).toBeInTheDocument();
    expect(screen.getByText('Daily Cost')).toBeInTheDocument();
  });
});
