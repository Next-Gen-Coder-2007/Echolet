import React, { useEffect, useState, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItemData {
  id: string;
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastPopupProps {
  toast: ToastItemData;
  onDismiss: (id: string) => void;
}

export const ToastPopup: React.FC<ToastPopupProps> = ({ toast, onDismiss }) => {
  const { id, title, message, type = 'info', duration = 5000 } = toast;
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerDismiss = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(id);
    }, 150);
  };

  useEffect(() => {
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        triggerDismiss();
      }, duration);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration]);

  const renderIcon = (toastType: ToastType) => {
    switch (toastType) {
      case 'success':
        return (
          <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        );
      case 'error':
        return (
          <span className="w-6 h-6 rounded-full bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </span>
        );
      case 'warning':
        return (
          <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
        );
      case 'info':
      default:
        return (
          <span className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 border border-purple-200/80 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </span>
        );
    }
  };

  const displayTitle = title || (type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Notice');
  const hasSubtitle = Boolean(message && message !== displayTitle);

  return (
    <div
      role="status"
      onClick={triggerDismiss}
      className={`pointer-events-auto flex items-center gap-3.5 px-4 py-3 min-w-[270px] max-w-[370px] bg-white/95 text-slate-800 backdrop-blur-md rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/80 transition-all duration-150 select-none cursor-pointer hover:bg-white hover:border-slate-300 ${
        isExiting ? 'animate-toast-out' : 'animate-toast-in'
      }`}
    >
      {renderIcon(type)}

      <div className="flex-1 min-w-0 pr-1">
        <p className="font-semibold text-slate-800 text-sm leading-snug truncate">
          {displayTitle}
        </p>
        {hasSubtitle && (
          <p className="text-xs text-slate-500 font-normal leading-relaxed mt-0.5 line-clamp-2">
            {message}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          triggerDismiss();
        }}
        className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 -mr-1"
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

export default ToastPopup;
