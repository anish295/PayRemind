import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = 'items',
}) {
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="pagination">
      <p className="pagination-info">
        Showing {start} to {end} of {totalItems} {itemLabel}
      </p>
      <div className="pagination-controls">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="pagination-btn"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="pagination-page" aria-current="page">
          {page}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="pagination-btn"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
