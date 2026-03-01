import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotificationsPage from '../../app/notifications/page';

vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        notifications: [
          {
            id: 1,
            agent_id: 'agent-1',
            channel: 'log',
            title: 'CPU Alert',
            severity: 'warning',
            message: 'CPU usage exceeded 90%',
            status: 'sent',
            created_at: '2026-03-01T12:00:00Z',
          },
          {
            id: 2,
            agent_id: 'agent-2',
            channel: 'slack',
            title: 'Agent Down',
            severity: 'critical',
            message: 'Agent stopped unexpectedly',
            status: 'sent',
            created_at: '2026-03-01T11:00:00Z',
          },
        ],
      }),
  }),
}));

vi.mock('../../lib/ws', () => ({
  useWebSocket: vi.fn(),
}));

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page heading', async () => {
    render(<NotificationsPage />);
    expect(await screen.findByText('Notifications')).toBeInTheDocument();
  });

  it('should render severity filter buttons', async () => {
    render(<NotificationsPage />);
    // Wait for data to load, then check filter buttons
    // "all" appears as filter; "critical"/"warning" also appear in the notification rows
    expect(await screen.findByText('Notifications')).toBeInTheDocument();
    const allButtons = screen.getAllByText('all');
    expect(allButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('should render the notification table', async () => {
    render(<NotificationsPage />);
    expect(await screen.findByLabelText('Notification list')).toBeInTheDocument();
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('Message')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('Timestamp')).toBeInTheDocument();
  });

  it('should show mark all as read button when there are unread notifications', async () => {
    render(<NotificationsPage />);
    const markAllBtn = await screen.findByText(/Mark all as read/);
    expect(markAllBtn).toBeInTheDocument();
  });

  it('should render date range filter inputs', async () => {
    render(<NotificationsPage />);
    expect(await screen.findByLabelText('From:')).toBeInTheDocument();
    expect(screen.getByLabelText('To:')).toBeInTheDocument();
  });
});
