import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AgentsPage from '../../app/agents/page';

// Mock next modules
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/agents',
}));

// Mock apiFetch
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve([
        {
          id: 'agent-1',
          name: 'test-agent',
          type: 'watcher',
          status: 'running',
          lastRun: '2026-03-01T12:00:00Z',
        },
        {
          id: 'agent-2',
          name: 'stopped-agent',
          type: 'doer',
          status: 'stopped',
          lastRun: null,
        },
      ]),
  }),
}));

// Mock WebSocket
vi.mock('../../lib/ws', () => ({
  useWebSocket: vi.fn(),
}));

// Mock toast store
vi.mock('../../lib/toast-store', () => ({
  useToastStore: () => ({ addToast: vi.fn() }),
}));

describe('AgentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page heading and new agent link', async () => {
    render(<AgentsPage />);
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('New Agent')).toBeInTheDocument();
  });

  it('should render status filter buttons', () => {
    render(<AgentsPage />);
    expect(screen.getByText('all')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText('stopped')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('should have a search input for filtering agents', () => {
    render(<AgentsPage />);
    const searchInput = screen.getByLabelText('Search agents by name');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', 'Search agents...');
  });

  it('should render the agent table with correct columns', () => {
    render(<AgentsPage />);
    expect(screen.getByLabelText('Agent list')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Last Run')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });
});
