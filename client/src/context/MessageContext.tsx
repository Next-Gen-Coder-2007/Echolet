import React, { createContext, useContext, useState, useCallback } from 'react';
import ToastPopup, { type ToastItemData, type ToastType } from '../components/common/ToastPopup';

export type MessageType = ToastType;

export interface MessageOptions {
  id?: string;
  title?: string;
  message: string;
  type?: MessageType;
  duration?: number;
}

export interface MessageContextType {
  toasts: ToastItemData[];
  showMessage: (options: MessageOptions | string, type?: MessageType, duration?: number) => void;
  showSuccess: (message: string, title?: string, duration?: number) => void;
  showError: (message: string, title?: string, duration?: number) => void;
  showInfo: (message: string, title?: string, duration?: number) => void;
  showWarning: (message: string, title?: string, duration?: number) => void;
  closeMessage: (id?: string) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItemData[]>([]);

  const closeMessage = useCallback((id?: string) => {
    if (!id) {
      setToasts((prev) => prev.slice(0, -1));
      return;
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showMessage = useCallback(
    (options: MessageOptions | string, type: MessageType = 'info', duration: number = 5000) => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      const newToast: ToastItemData =
        typeof options === 'string'
          ? {
              id,
              message: options,
              type,
              duration,
            }
          : {
              id: options.id || id,
              message: options.message,
              title: options.title,
              type: options.type || type,
              duration: options.duration ?? duration,
            };

      setToasts((prev) => {
        const isDuplicate = prev.some(
          (t) => t.message === newToast.message && t.type === newToast.type
        );
        if (isDuplicate) return prev;
        const updated = [...prev, newToast];
        return updated.slice(-5);
      });
    },
    []
  );

  const showSuccess = useCallback(
    (message: string, title: string = 'Success', duration: number = 5000) => {
      showMessage({ message, title, type: 'success', duration });
    },
    [showMessage]
  );

  const showError = useCallback(
    (message: string, title: string = 'Error', duration: number = 5000) => {
      showMessage({ message, title, type: 'error', duration });
    },
    [showMessage]
  );

  const showInfo = useCallback(
    (message: string, title: string = 'Notice', duration: number = 5000) => {
      showMessage({ message, title, type: 'info', duration });
    },
    [showMessage]
  );

  const showWarning = useCallback(
    (message: string, title: string = 'Warning', duration: number = 5000) => {
      showMessage({ message, title, type: 'warning', duration });
    },
    [showMessage]
  );

  return (
    <MessageContext.Provider
      value={{
        toasts,
        showMessage,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        closeMessage,
      }}
    >
      {children}

      <div
        style={{ zIndex: 99999 }}
        className="fixed top-5 right-5 z-[99999] flex flex-col items-end gap-3 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastPopup
            key={toast.id}
            toast={toast}
            onDismiss={closeMessage}
          />
        ))}
      </div>
    </MessageContext.Provider>
  );
};

export const useMessage = (): MessageContextType => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessage must be used within a MessageProvider');
  }
  return context;
};

export default MessageContext;
