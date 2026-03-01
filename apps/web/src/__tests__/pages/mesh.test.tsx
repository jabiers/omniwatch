import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MeshPage from '../../app/mesh/page';

vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/mesh/events')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            events: [
              {
                id: 1,
                publisher_id: 'agent-1',
                topic: 'cpu.alert',
                payload: '{"value":95}',
                created_at: '2026-03-01T12:00:00Z',
              },
            ],
          }),
      });
    }
    if (url.includes('/api/mesh/subscriptions')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            subscriptions: [{ agent_id: 'agent-1', agent_name: 'cpu-watcher', topic: 'cpu.alert' }],
          }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }),
}));

describe('MeshPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render mesh heading and refresh button', async () => {
    render(<MeshPage />);
    expect(await screen.findByText('Agent Mesh')).toBeInTheDocument();
    expect(screen.getByLabelText('Refresh mesh data')).toBeInTheDocument();
  });

  it('should render topology summary cards', async () => {
    render(<MeshPage />);
    expect(await screen.findByText('Active Topics')).toBeInTheDocument();
    expect(screen.getByText('Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Events (24h)')).toBeInTheDocument();
  });

  it('should render subscriptions section', async () => {
    render(<MeshPage />);
    expect(await screen.findByText('Active Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('cpu-watcher')).toBeInTheDocument();
  });

  it('should render event stream section with topic filter', async () => {
    render(<MeshPage />);
    expect(await screen.findByText('Event Stream')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by topic')).toBeInTheDocument();
  });
});
