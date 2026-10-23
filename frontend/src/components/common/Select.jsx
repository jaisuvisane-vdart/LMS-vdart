import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, X } from 'lucide-react';

/**
 * Enterprise Searchable Select Component with Rounded Border Format
 * Replaces native OS <select> popups with modern portal-backed dropdowns.
 * Features an integrated search input with matching rounded border radius.
 */
const Select = ({
  label,
  id,
  name,
  value,
  onChange,
  options = [],
  required = false,
  disabled = false,
  error = '',
  className = '',
  placeholder = 'Select option...',
  showSearch = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 220, openUpward: false });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options to { value, label } format
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          value: opt.value !== undefined ? opt.value : '',
          label: opt.label !== undefined ? String(opt.label) : String(opt.value || ''),
          disabled: Boolean(opt.disabled),
        };
      }
      return {
        value: opt,
        label: String(opt),
        disabled: false,
      };
    });
  }, [options]);

  // Find currently selected option
  const currentOption = useMemo(() => {
    return normalizedOptions.find((opt) => String(opt.value) === String(value));
  }, [normalizedOptions, value]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const term = searchTerm.toLowerCase();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        String(opt.value).toLowerCase().includes(term)
    );
  }, [normalizedOptions, searchTerm]);

  // Dynamic viewport coordinate calculation
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const estimatedHeight = Math.min(320, filteredOptions.length * 38 + (showSearch ? 60 : 16));
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

    let left = rect.left;
    const width = Math.max(rect.width, 220);
    if (left + width > window.innerWidth - 8) {
      left = window.innerWidth - width - 8;
    }
    if (left < 8) left = 8;

    const top = openUpward ? rect.top - estimatedHeight - 6 : rect.bottom + 6;

    setCoords({
      top: Math.max(8, top),
      left,
      width,
      openUpward,
    });
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setSearchTerm('');
    }
    setIsOpen((prev) => !prev);
  };

  const handleSelectOption = (opt) => {
    if (opt.disabled) return;
    setIsOpen(false);
    setSearchTerm('');
    if (onChange) {
      onChange({
        target: {
          name: name || id || '',
          id: id || name || '',
          value: opt.value,
        },
      });
    }
  };

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, showSearch]);

  // Outside click, escape key, and window event listeners
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  return (
    <div className={`relative w-full ${className}`}>
      {label && (
        <label
          htmlFor={id || name}
          className="block text-xs font-semibold uppercase tracking-wider text-[#172B4D] mb-1.5"
        >
          {label} {required && <span className="text-[#DC2626] font-bold">*</span>}
        </label>
      )}

      {/* Trigger Box with Rounded Border */}
      <button
        ref={triggerRef}
        id={id || name}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full text-xs sm:text-sm font-semibold h-11 px-4 rounded-xl border bg-white flex items-center justify-between transition-all duration-150 cursor-pointer select-none text-left ${
          error
            ? 'border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20'
            : isOpen
            ? 'border-[#2C51A2] ring-2 ring-[#2C51A2]/20 shadow-sm'
            : 'border-[#CBD5E1] hover:border-[#2C51A2] hover:bg-[#F8FAFC]'
        } ${disabled ? 'bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed opacity-60' : 'text-[#172B4D]'}`}
      >
        <span className="truncate">
          {currentOption ? currentOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 ml-2 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#2C51A2]' : 'text-[#64748B]'
          }`}
        />
      </button>

      {error && <p className="mt-1.5 text-xs text-[#DC2626] font-medium">{error}</p>}

      {/* Dropdown Popover List via React Portal */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="bg-white rounded-2xl shadow-2xl border border-[#CBD5E1] p-2 flex flex-col animate-in fade-in zoom-in-95 duration-100 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Integrated Search Box with Rounded Border Format */}
            {showSearch && (
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search options..."
                  className="w-full h-9 pl-8 pr-7 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs font-medium text-[#172B4D] placeholder-[#94A3B8] focus:outline-none focus:border-[#2C51A2] focus:ring-2 focus:ring-[#2C51A2]/20 focus:bg-white transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#172B4D]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Options List with Rounded Hover Items */}
            <div className="max-h-56 overflow-y-auto touch-scroll space-y-1 py-0.5">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#64748B] italic">
                  No matching options found
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => handleSelectOption(opt)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left border ${
                        opt.disabled
                          ? 'opacity-40 cursor-not-allowed text-[#94A3B8] border-transparent'
                          : isSelected
                          ? 'bg-[#EFF6FF] text-[#2C51A2] border-[#BFDBFE]'
                          : 'text-[#172B4D] border-transparent hover:bg-[#F3F6FB] hover:text-[#2C51A2] hover:border-[#E2E8F0]'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#2C51A2] shrink-0 ml-2" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Select;
