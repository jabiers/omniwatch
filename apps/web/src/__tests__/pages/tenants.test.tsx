import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TenantsPage from '../../app/tenants/page';

vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/tenants')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            tenants: [
              {
                id: 'tenant-1',
                name: 'Acme Corp',
                plan: 'pro',
                max_agents: 50,
                created_at: '2026-01-01T00:00:00Z',
              },
            ],
          }),
      });
    }
    if (url.includes('/api/users')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            users: [
              {
                id: 'user-1',
                tenant_id: 'tenant-1',
                email: 'admin@acme.com',
                role: 'admin',
                created_at: '2026-01-01T00:00:00Z',
              },
            ],
          }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }),
}));

describe('TenantsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page heading', async () => {
    render(<TenantsPage />);
    expect(await screen.findByText(/User Management/)).toBeInTheDocument();
  });

  it('should render tenant table', async () => {
    render(<TenantsPage />);
    expect(await screen.findByLabelText('Tenant list')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('should render new tenant button', async () => {
    render(<TenantsPage />);
    expect(await screen.findByText('New Tenant')).toBeInTheDocument();
  });

  it('should render users section', async () => {
    render(<TenantsPage />);
    expect(await screen.findByText('Users')).toBeInTheDocument();
    expect(screen.getByText('New User')).toBeInTheDocument();
  });

  it('should display user details', async () => {
    render(<TenantsPage />);
    expect(await screen.findByText('admin@acme.com')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });
});
