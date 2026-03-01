import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import QueuePage from '../../app/queue/page';

vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/queue/stats')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            pending: 5,
            processing: 2,
            done_today: 120,
            dead_letters: 3,
          }),
      });
    }
    if (url.includes('/api/queue/dead-letters')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 1,
              topic: 'agent.check',
              error: 'Timeout exceeded',
              payload: '{}',
              created_at: '2026-03-01T12:00:00Z',
            },
          ]),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }),
}));

describe('QueuePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the queue heading and refresh button', async () => {
    render(<QueuePage />);
    expect(await screen.findByText('Message Queue')).toBeInTheDocument();
    expect(screen.getByLabelText('Refresh queue data')).toBeInTheDocument();
  });

  it('should render queue stat cards', async () => {
    render(<QueuePage />);
    expect(await screen.findByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('Done Today')).toBeInTheDocument();
    expect(screen.getByText('Dead Letters')).toBeInTheDocument();
  });

  it('should render dead letter queue section', async () => {
    render(<QueuePage />);
    expect(await screen.findByText('Dead Letter Queue')).toBeInTheDocument();
  });

  it('should show retry buttons for dead letters', async () => {
    render(<QueuePage />);
    expect(await screen.findByText('Retry All')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
