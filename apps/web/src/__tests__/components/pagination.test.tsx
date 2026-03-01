import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '../../components/pagination';

describe('Pagination', () => {
  it('should render page info', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should disable prev on first page', () => {
    render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByText('Prev').closest('button')).toBeDisabled();
  });

  it('should disable next on last page', () => {
    render(<Pagination page={5} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByText('Next').closest('button')).toBeDisabled();
  });

  it('should call onPageChange with correct values', () => {
    const onChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={onChange} />);
    fireEvent.click(screen.getByText('Prev'));
    expect(onChange).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByText('Next'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('should enable both buttons on middle page', () => {
    render(<Pagination page={3} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByText('Prev').closest('button')).not.toBeDisabled();
    expect(screen.getByText('Next').closest('button')).not.toBeDisabled();
  });
});
