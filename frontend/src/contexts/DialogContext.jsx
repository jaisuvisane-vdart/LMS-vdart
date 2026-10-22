import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AlertDialog from '../components/common/AlertDialog';

const DialogContext = createContext(null);

export const DialogProvider = ({ children }) => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: 'Notification',
    message: '',
    type: 'info',
    isConfirm: false,
    confirmText: 'OK',
    cancelText: 'Cancel',
    onConfirm: null,
    onCancel: null,
  });

  const closeDialog = useCallback(() => {
    setDialogState((prev) => {
      if (prev.onCancel) {
        prev.onCancel();
      }
      return { ...prev, isOpen: false, onConfirm: null, onCancel: null };
    });
  }, []);

  const showAlert = useCallback((options) => {
    let config = {};
    if (typeof options === 'string') {
      config = { message: options, title: 'Notification', type: 'info' };
    } else {
      config = options || {};
    }

    setDialogState({
      isOpen: true,
      title: config.title || (config.type === 'error' ? 'Notice' : 'Notification'),
      message: config.message || '',
      type: config.type || (config.type === 'error' ? 'error' : 'info'),
      isConfirm: false,
      confirmText: config.confirmText || 'OK',
      cancelText: 'Cancel',
      onConfirm: config.onConfirm || null,
      onCancel: null,
    });
  }, []);

  const showConfirm = useCallback((options) => {
    let config = {};
    if (typeof options === 'string') {
      config = { message: options, title: 'Confirmation Required', type: 'confirm' };
    } else {
      config = options || {};
    }

    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title: config.title || 'Confirmation Required',
        message: config.message || '',
        type: config.type || 'confirm',
        isConfirm: true,
        confirmText: config.confirmText || 'Confirm',
        cancelText: config.cancelText || 'Cancel',
        onConfirm: () => {
          if (config.onConfirm) config.onConfirm();
          resolve(true);
          setDialogState((prev) => ({ ...prev, isOpen: false, onConfirm: null, onCancel: null }));
        },
        onCancel: () => {
          if (config.onCancel) config.onCancel();
          resolve(false);
          setDialogState((prev) => ({ ...prev, isOpen: false, onConfirm: null, onCancel: null }));
        },
      });
    });
  }, []);

  // Intercept native browser alert to guarantee no native alert popups appear
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => {
      showAlert({
        title: 'System Notice',
        message: typeof msg === 'object' ? JSON.stringify(msg) : String(msg || ''),
        type: 'info',
      });
    };

    window.showAppAlert = showAlert;
    window.showAppConfirm = showConfirm;

    return () => {
      window.alert = originalAlert;
    };
  }, [showAlert, showConfirm]);

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, closeDialog }}>
      {children}
      <AlertDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        type={dialogState.type}
        isConfirm={dialogState.isConfirm}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        onConfirm={dialogState.onConfirm}
        onClose={closeDialog}
      />
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    return {
      showAlert: (opts) => {
        if (typeof window !== 'undefined' && window.showAppAlert) {
          window.showAppAlert(opts);
        }
      },
      showConfirm: (opts) => {
        if (typeof window !== 'undefined' && window.showAppConfirm) {
          return window.showAppConfirm(opts);
        }
        return Promise.resolve(false);
      },
      closeDialog: () => {},
    };
  }
  return context;
};

export default DialogContext;
