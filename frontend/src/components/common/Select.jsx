import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, X, Plus, Loader2 } from 'lucide-react';

/**
 * Enterprise Searchable Select Component with Direct Creation Support
 * Supports search filtering and inline creation of new options directly from the dropdown.
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
  allowCreate = false,
  createLabel = 'Add New',
  onCreate = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 220, openUpward: false });
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [inlineCreateValue, setInlineCreateValue] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const inlineInputRef = useRef(null);

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

  // Check if current search has an exact case-insensitive match
  const hasExactMatch = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return normalizedOptions.some((opt) => opt.label.toLowerCase() === term);
  }, [normalizedOptions, searchTerm]);

  // Dynamic viewport coordinate calculation
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const estimatedHeight = Math.min(340, filteredOptions.length * 38 + (showSearch ? 60 : 16) + (allowCreate ? 52 : 0));
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
      setIsCreatingInline(false);
      setInlineCreateValue('');
    }
    setIsOpen((prev) => !prev);
  };

  const handleSelectOption = (opt) => {
    if (opt.disabled) return;
    setIsOpen(false);
    setSearchTerm('');
    setIsCreatingInline(false);
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

  const handleExecuteCreate = async (newValue) => {
    const trimmed = (newValue || '').trim();
    if (!trimmed || createLoading) return;

    try {
      setCreateLoading(true);
      let createdResult = trimmed;
      if (onCreate) {
        const res = await onCreate(trimmed);
        if (res) {
          createdResult = typeof res === 'object' && res.value !== undefined ? res.value : res;
        }
      }

      if (onChange) {
        onChange({
          target: {
            name: name || id || '',
            id: id || name || '',
            value: createdResult,
          },
        });
      }

      setSearchTerm('');
      setIsCreatingInline(false);
      setInlineCreateValue('');
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to create option in Select:', err);
    } finally {
      setCreateLoading(false);
    }
  };

  // Focus search input or inline create input when dropdown opens or mode changes
  useEffect(() => {
    if (isOpen) {
      if (isCreatingInline && inlineInputRef.current) {
        const timer = setTimeout(() => inlineInputRef.current?.focus(), 50);
        return () => clearTimeout(timer);
      }
      if (showSearch && searchInputRef.current) {
        const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, showSearch, isCreatingInline]);

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
        setIsCreatingInline(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsCreatingInline(false);
      }
    };

    const handleResize = () => {
      setIsOpen(false);
      setIsCreatingInline(false);
    };

    const handleScroll = (e) => {
      // If the scroll occurred within the dropdown popover itself, preserve open state
      if (
        e.target &&
        e.target instanceof Node &&
        dropdownRef.current &&
        dropdownRef.current.contains(e.target)
      ) {
        return;
      }
      setIsOpen(false);
      setIsCreatingInline(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
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
            onMouseDown={(e) => e.stopPropagation()}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && allowCreate && !hasExactMatch && searchTerm.trim()) {
                      e.preventDefault();
                      handleExecuteCreate(searchTerm.trim());
                    }
                  }}
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

            {/* Quick Create Prompt when searching and no exact match exists */}
            {allowCreate && searchTerm.trim() && !hasExactMatch && (
              <button
                type="button"
                disabled={createLoading}
                onClick={() => handleExecuteCreate(searchTerm.trim())}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#2C51A2] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] transition-all text-left mb-1.5 cursor-pointer"
              >
                {createLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2C51A2] shrink-0" />
                ) : (
                  <Plus className="w-3.5 h-3.5 text-[#2C51A2] shrink-0" />
                )}
                <span className="truncate">
                  {createLoading ? 'Adding...' : `${createLabel}: "${searchTerm.trim()}"`}
                </span>
              </button>
            )}

            {/* Options List with Rounded Hover Items */}
            <div className="max-h-56 overflow-y-auto touch-scroll overscroll-contain space-y-1 py-0.5">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#64748B] italic">
                  {allowCreate ? 'No matching options. Press Enter or click below to add.' : 'No matching options found'}
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

            {/* Inline Footer Add Action when allowCreate is enabled */}
            {allowCreate && (
              <div className="pt-2 mt-1 border-t border-[#E2E8F0]">
                {isCreatingInline ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={inlineInputRef}
                      type="text"
                      value={inlineCreateValue}
                      onChange={(e) => setInlineCreateValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleExecuteCreate(inlineCreateValue);
                        } else if (e.key === 'Escape') {
                          setIsCreatingInline(false);
                        }
                      }}
                      placeholder="Type new option name..."
                      className="flex-1 h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-medium text-[#172B4D] placeholder-[#94A3B8] focus:outline-none focus:border-[#2C51A2] focus:ring-1 focus:ring-[#2C51A2]"
                    />
                    <button
                      type="button"
                      disabled={!inlineCreateValue.trim() || createLoading}
                      onClick={() => handleExecuteCreate(inlineCreateValue)}
                      className="h-8 px-3 rounded-lg bg-[#2C51A2] text-white text-xs font-bold hover:bg-[#1E3B78] disabled:opacity-50 transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                    >
                      {createLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingInline(false);
                        setInlineCreateValue('');
                      }}
                      className="h-8 px-2 rounded-lg text-[#64748B] hover:text-[#172B4D] hover:bg-[#F1F5F9] transition-colors shrink-0 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingInline(true);
                      setInlineCreateValue(searchTerm.trim());
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold text-[#2C51A2] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{createLabel}</span>
                  </button>
                )}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export default Select;
