import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Calculate sliding page window
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safeCurrentPage - delta && i <= safeCurrentPage + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC]/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs select-none">
      {/* Range Summary Text */}
      <div className="text-[#64748B] font-medium">
        Showing <span className="font-bold text-[#172B4D]">{startItem}</span> to{' '}
        <span className="font-bold text-[#172B4D]">{endItem}</span> of{' '}
        <span className="font-bold text-[#2C51A2]">{totalItems}</span> entries
      </div>

      {/* Controls Container */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Page Size Selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-[#64748B] font-medium">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="h-8 px-2.5 bg-white border border-[#CBD5E1] hover:border-[#2C51A2] text-[#172B4D] text-xs font-semibold rounded-xl focus:outline-none focus:border-[#2C51A2] focus:ring-2 focus:ring-[#2C51A2]/20 cursor-pointer shadow-xs transition-all"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* First Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage <= 1}
          className="h-8 w-8 flex items-center justify-center bg-white border border-[#CBD5E1] text-[#172B4D] rounded-xl hover:bg-[#E2E9F4] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="First Page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          className="h-8 px-2.5 flex items-center gap-1 bg-white border border-[#CBD5E1] text-[#172B4D] text-xs font-semibold rounded-xl hover:bg-[#E2E9F4] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Numeric Page Window */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((num, idx) => {
            if (num === '...') {
              return (
                <span key={`dots-${idx}`} className="px-2 text-[#94A3B8] font-bold">
                  ...
                </span>
              );
            }
            const isActive = num === safeCurrentPage;
            return (
              <button
                key={`page-${num}`}
                type="button"
                onClick={() => onPageChange(num)}
                className={`h-8 min-w-[32px] px-2 text-xs font-bold rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#2C51A2] text-white shadow-sm'
                    : 'bg-white border border-[#CBD5E1] text-[#172B4D] hover:bg-[#E2E9F4]'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>

        {/* Next Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= totalPages}
          className="h-8 px-2.5 flex items-center gap-1 bg-white border border-[#CBD5E1] text-[#172B4D] text-xs font-semibold rounded-xl hover:bg-[#E2E9F4] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Next Page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safeCurrentPage >= totalPages}
          className="h-8 w-8 flex items-center justify-center bg-white border border-[#CBD5E1] text-[#172B4D] rounded-xl hover:bg-[#E2E9F4] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
