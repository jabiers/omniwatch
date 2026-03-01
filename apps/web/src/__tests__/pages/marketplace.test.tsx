import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MarketplacePage from '../../app/marketplace/page';

vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        recipes: [
          {
            id: 'r1',
            name: 'CPU Monitor',
            description: 'Monitors CPU usage',
            prompt: 'Watch CPU',
            category: 'monitoring',
            author: 'test',
            version: '1.0.0',
            downloads: 42,
            rating: 4.5,
            tags: ['cpu', 'monitoring'],
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
      }),
  }),
}));

describe('MarketplacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render marketplace heading and publish button', async () => {
    render(<MarketplacePage />);
    expect(await screen.findByText('Agent Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Publish Recipe')).toBeInTheDocument();
  });

  it('should render search input', async () => {
    render(<MarketplacePage />);
    expect(await screen.findByLabelText('Search marketplace')).toBeInTheDocument();
  });

  it('should render category filter pills', async () => {
    render(<MarketplacePage />);
    expect(await screen.findByText('All')).toBeInTheDocument();
    expect(screen.getByText('Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Automation')).toBeInTheDocument();
  });

  it('should render sort dropdown', async () => {
    render(<MarketplacePage />);
    expect(await screen.findByLabelText('Sort recipes')).toBeInTheDocument();
  });

  it('should render recipe card with install button', async () => {
    render(<MarketplacePage />);
    expect(await screen.findByText('CPU Monitor')).toBeInTheDocument();
    expect(screen.getByText('Install')).toBeInTheDocument();
  });
});
