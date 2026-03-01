'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Pagination controls styled for Glass Console dark theme */
export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-3 py-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={isFirst}
        aria-label="Previous page"
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-white/[0.08] bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Prev
      </button>

      <span className="text-sm text-gray-400">
        Page <span className="text-white font-medium">{page}</span> of{' '}
        <span className="text-white font-medium">{totalPages}</span>
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={isLast}
        aria-label="Next page"
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-white/[0.08] bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}
