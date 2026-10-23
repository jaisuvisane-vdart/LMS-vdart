import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import Button from './Button';

/**
 * Centered In-App Alert & Confirmation Popup Dialog
 * Replaces native browser alert() and confirm() dialogs with an in-app popup modal.
 */
const AlertDialog = ({
  isOpen,
  title = 'Notification',
  message = '',
  type = 'info', // 'info' | 'warning' | 'error' | 'success' | 'confirm'
  isConfirm = false,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onClose,
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

  const getHeaderIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-[#DC2626]" />;
      case 'warning':
      case 'confirm':
        return <AlertTriangle className="w-5 h-5 text-[#D97706]" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-[#2C51A2]" />;
      default:
        return <Info className="w-5 h-5 text-[#2C51A2]" />;
    }
  };

  const getConfirmButtonVariant = () => {
    switch (type) {
      case 'error':
      case 'confirm':
        return 'danger';
      case 'success':
        return 'primary';
      default:
        return 'navy';
    }
  };

  const handleConfirmClick = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const dialogNode = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isConfirm) {
          onClose();
        }
      }}
    >
      <div className="clay-modal rounded-2xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl my-auto border border-white/60">
        {/* Header */}
        <div
          className="px-5 py-4 text-white flex items-center justify-between gap-3 shrink-0"
          style={{
            background: 'linear-gradient(160deg, #1E3B78 0%, #2C51A2 100%)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.25)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-xs">
              {getHeaderIcon()}
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white truncate">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors focus:outline-none"
            title="Close Dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Body */}
        <div className="p-5 text-xs text-[#172B4D] leading-relaxed bg-[#F8FAFC]">
          <p className="whitespace-pre-line font-medium text-sm">{message}</p>
        </div>

        {/* Action Footer */}
        <div className="px-5 py-3.5 bg-white border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
          {isConfirm && (
            <Button variant="secondary" size="sm" onClick={onClose}>
              {cancelText}
            </Button>
          )}
          <Button
            variant={getConfirmButtonVariant()}
            size="sm"
            onClick={handleConfirmClick}
            autoFocus
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogNode, document.body);
};

export default AlertDialog;
