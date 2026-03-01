import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton, SkeletonCard, SkeletonTable } from '../../components/skeleton';

describe('Skeleton', () => {
  it('should render with animate-pulse class', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('animate-pulse');
  });

  it('should apply custom className', () => {
    const { container } = render(<Skeleton className="h-4 w-24" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('h-4');
    expect(el.className).toContain('w-24');
  });
});

describe('SkeletonCard', () => {
  it('should render two skeleton elements', () => {
    const { container } = render(<SkeletonCard />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(2);
  });
});

describe('SkeletonTable', () => {
  it('should render 5 rows by default', () => {
    const { container } = render(<SkeletonTable />);
    const rows = container.querySelectorAll('.animate-pulse');
    expect(rows.length).toBe(5);
  });

  it('should render custom number of rows', () => {
    const { container } = render(<SkeletonTable rows={3} />);
    const rows = container.querySelectorAll('.animate-pulse');
    expect(rows.length).toBe(3);
  });
});
