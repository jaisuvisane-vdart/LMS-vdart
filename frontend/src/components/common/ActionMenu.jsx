import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

/**
 * Enterprise ActionMenu Component
 * Renders a 3-dot trigger button with a sleek context popover dropdown via React Portal.
 * Solves table overflow-x-auto / overflow-hidden clipping traps completely.
 */
const ActionMenu = ({
  items = [],
  align = 'right',
  triggerTitle = 'Row Actions',
  buttonClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, openUpward: false });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Filter out any nullish items
  const activeItems = items.filter(Boolean);

  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 190;
    const estimatedItemHeight = 36;
    const menuHeight = activeItems.length * estimatedItemHeight + 12;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight && rect.top > menuHeight;

    let left = align === 'right' ? rect.right - menuWidth : rect.left;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }
    if (left < 8) left = 8;

    const top = openUpward ? rect.top - menuHeight - 4 : rect.bottom + 4;

    setCoords({
      top: Math.max(8, top),
      left,
      openUpward,
    });
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleResize = () => {
      setIsOpen(false);
    };

    const handleScroll = (e) => {
      if (
        e.target &&
        e.target instanceof Node &&
        menuRef.current &&
        menuRef.current.contains(e.target)
      ) {
        return;
      }
      setIsOpen(false);
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

  if (activeItems.length === 0) return null;

  return (
    <div className="relative inline-flex items-center justify-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        title={triggerTitle}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={`p-1.5 rounded-xl text-[#64748B] hover:text-[#1E3B78] hover:bg-[#EFF6FF] border border-transparent hover:border-[#BFDBFE] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2C51A2]/30 active:bg-[#E2E9F4] ${
          isOpen ? 'bg-[#EFF6FF] text-[#1E3B78] border-[#BFDBFE]' : ''
        } ${buttonClassName}`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: '190px',
              zIndex: 9999,
            }}
            className="bg-white rounded-2xl shadow-2xl border border-[#CBD5E1] p-1.5 overflow-hidden text-left text-xs space-y-1"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {activeItems.map((item, idx) => {
              const Icon = item.icon;
              const isDanger = item.variant === 'danger';
              const isWarning = item.variant === 'warning';

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={item.disabled}
                  title={item.title || item.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.disabled) return;
                    setIsOpen(false);
                    if (item.onClick) item.onClick(e);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all text-left border ${
                    item.disabled
                      ? 'opacity-40 cursor-not-allowed text-[#94A3B8] border-transparent'
                      : isDanger
                      ? 'text-[#DC2626] border-transparent hover:border-[#FECACA] hover:bg-[#FEE2E2] active:bg-[#FECACA]'
                      : isWarning
                      ? 'text-[#B45309] border-transparent hover:border-[#FDE68A] hover:bg-[#FEF3C7] active:bg-[#FDE68A]'
                      : 'text-[#172B4D] border-transparent hover:border-[#BFDBFE] hover:text-[#2C51A2] hover:bg-[#EFF6FF] active:bg-[#E2E9F4]'
                  }`}
                >
                  {Icon && (
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isDanger
                          ? 'text-[#DC2626]'
                          : isWarning
                          ? 'text-[#B45309]'
                          : 'text-[#64748B]'
                      }`}
                    />
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};

export default ActionMenu;
