import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Enterprise Centered Minimal Claymorphic Modal component
 * Mounted via React Portal directly to document.body to prevent CSS containing block
 * and transform traps from ancestor layout nodes.
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background body scroll while modal dialog is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const modalNode = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`clay-modal rounded-2xl w-full ${maxWidth} flex flex-col max-h-[90vh] overflow-hidden my-auto shrink-0 shadow-2xl`}
      >
        {/* Modal Header with Minimal Clay Depth */}
        <div 
          className="px-6 py-4.5 sm:py-5 text-white flex items-center justify-between gap-4 shrink-0"
          style={{
            background: 'linear-gradient(160deg, #325bb5 0%, #1E3B78 100%)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.3), inset 0 -1px 2px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div className="min-w-0 pr-2">
            <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-white leading-snug">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-[#E2E9F4] mt-1 leading-normal">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#E2E9F4] hover:text-white p-2 rounded-xl hover:bg-white/10 active:translate-y-0.5 transition-all focus:outline-none shrink-0"
            title="Close Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Scrollable Flex Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 text-[#172B4D] touch-scroll">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};

export default Modal;
