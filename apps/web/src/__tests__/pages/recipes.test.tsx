import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecipesPage from '../../app/recipes/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/recipes',
}));

// Mock apiFetch — return sample recipes
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        recipes: [
          {
            id: 'r1',
            name: 'API Health Monitor',
            description: 'Monitors API endpoints',
            category: 'monitoring',
            prompt: 'Monitor APIs',
            tags: ['http', 'health'],
          },
          {
            id: 'r2',
            name: 'Log Analyzer',
            description: 'Analyzes log patterns',
            category: 'devops',
            prompt: 'Analyze logs',
            tags: ['logs', 'analysis'],
          },
        ],
      }),
  }),
}));

describe('RecipesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page heading and description', () => {
    render(<RecipesPage />);

    expect(screen.getByText('Agent Recipes')).toBeInTheDocument();
    expect(
      screen.getByText('One-click agent templates. Install and customize.'),
    ).toBeInTheDocument();
  });

  it('should render category filter buttons', () => {
    render(<RecipesPage />);

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Monitoring')).toBeInTheDocument();
    expect(screen.getByText('DevOps')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('should render recipe cards after loading', async () => {
    render(<RecipesPage />);

    expect(await screen.findByText('API Health Monitor')).toBeInTheDocument();
    expect(screen.getByText('Log Analyzer')).toBeInTheDocument();
    expect(screen.getByText('Monitors API endpoints')).toBeInTheDocument();
  });

  it('should render search input', () => {
    render(<RecipesPage />);

    expect(screen.getByPlaceholderText('Search recipes...')).toBeInTheDocument();
  });
});
