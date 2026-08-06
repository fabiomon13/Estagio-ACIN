import { ChevronIcon } from '../../icons';
import type { PaginationProps } from './Pagination.types';

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isFirstPage}
        aria-label="Página anterior"
        className="rounded-full bg-primary p-2 text-content hover:bg-primary-hover active:bg-primary-active disabled:cursor-not-allowed disabled:bg-surface-raised"
      >
        <ChevronIcon className="rotate-90" size={20} />
      </button>

      <span className="text-content-subtle">
        {currentPage} / {totalPages}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLastPage}
        aria-label="Página seguinte"
        className="rounded-full bg-primary p-2 text-content hover:bg-primary-hover active:bg-primary-active disabled:cursor-not-allowed disabled:bg-surface-raised"
      >
        <span className="rotate-180">
          <ChevronIcon className="rotate-270" size={20} />
        </span>
      </button>
    </div>
  );
}
