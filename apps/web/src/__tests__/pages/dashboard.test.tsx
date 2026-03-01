import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from '../../app/page';

// Mock next modules
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock recharts to avoid canvas issues
vi.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => <div data-testid="mock-pie" />,
  Cell: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock apiFetch — returns agents, notifications, system status
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/agents')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            agents: [
              { id: 'a1', name: 'watcher-1', type: 'watcher', status: 'running' },
              { id: 'a2', name: 'doer-1', type: 'doer', status: 'stopped' },
              { id: 'a3', name: 'error-agent', type: 'watcher', status: 'error' },
            ],
          }),
      });
    }
    if (url.includes('/api/notifications')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            notifications: [
              {
                id: 1,
                agent_id: 'a1',
                title: 'Alert',
                severity: 'warning',
                message: 'High CPU',
                created_at: new Date().toISOString(),
              },
            ],
          }),
      });
    }
    if (url.includes('/api/system/status')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ uptime: 3661, agentCount: 3, runningCount: 1 }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }),
}));

// Mock WebSocket
vi.mock('../../lib/ws', () => ({
  useWebSocket: () => ({ connected: true }),
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the dashboard heading', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should render stat cards', async () => {
    render(<DashboardPage />);
    expect(await screen.findByText('Total Agents')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Errors')).toBeInTheDocument();
    expect(screen.getByText('Notifications Today')).toBeInTheDocument();
  });

  it('should render quick action links', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Create Agent')).toBeInTheDocument();
    expect(screen.getByText('Browse Recipes')).toBeInTheDocument();
  });

  it('should render WebSocket connection status', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('should display recent agents after loading', async () => {
    render(<DashboardPage />);
    expect(await screen.findByText('Recent Agents')).toBeInTheDocument();
    expect(await screen.findByText('watcher-1')).toBeInTheDocument();
  });

  it('should display recent notifications section', async () => {
    render(<DashboardPage />);
    expect(await screen.findByText('Recent Notifications')).toBeInTheDocument();
    expect(await screen.findByText('High CPU')).toBeInTheDocument();
  });

  it('should display system uptime', async () => {
    render(<DashboardPage />);
    expect(await screen.findByText('System Uptime:')).toBeInTheDocument();
    expect(await screen.findByText('1h 1m')).toBeInTheDocument();
  });
});
