import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, total, pageSize, onPageChange }) => {
  if (totalPages <= 1 && total <= pageSize) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 sm:px-6 mt-4">
      <div className="text-sm text-slate-700">
        Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages || 1}</span> ({total} total results)
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1 text-sm rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1 text-sm rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
        >
          Next
        </button>
      </div>
    </div>
  );
};