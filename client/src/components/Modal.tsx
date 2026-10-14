import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HiXMark } from 'react-icons/hi2';

export type BackdropVariant =
  | 'dark'
  | 'black'
  | 'light'
  | 'glass'
  | 'blur'
  | 'gradient'
  | 'transparent';

export type ModalSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl'
  | 'full'
  | 'auto';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  size?: ModalSize;
  backdropVariant?: BackdropVariant;
  backdropClassName?: string;
  className?: string;
  contentClassName?: string;
  showCloseButton?: boolean;
  closeButtonPosition?: 'inside' | 'outside' | 'none';
  closeButtonClassName?: string;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  preventScroll?: boolean;
  zIndex?: number;
}

const BACKDROP_STYLES: Record<BackdropVariant, string> = {
  glass: 'bg-black/70 backdrop-blur-2xl',
  dark: 'bg-slate-950/75 backdrop-blur-2xl',
  black: 'bg-black/85 backdrop-blur-2xl',
  light: 'bg-slate-900/40 backdrop-blur-xl',
  blur: 'bg-slate-950/65 backdrop-blur-2xl',
  gradient: 'bg-gradient-to-br from-slate-950/90 via-purple-950/85 to-slate-950/90 backdrop-blur-2xl',
  transparent: 'bg-transparent',
};

const SIZE_STYLES: Record<ModalSize, string> = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  full: 'w-full h-full max-w-none max-h-none rounded-none',
  auto: 'max-w-fit',
};

export default function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  icon,
  size = 'md',
  backdropVariant = 'glass',
  backdropClassName,
  className = '',
  contentClassName = '',
  showCloseButton = true,
  closeButtonPosition = 'inside',
  closeButtonClassName = '',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  preventScroll = true,
  zIndex = 50,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener('keydown', handleKeyDown);

    const originalOverflow = document.body.style.overflow;
    if (preventScroll) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (preventScroll) {
        document.body.style.overflow = originalOverflow;
      }
    };
  }, [isOpen, handleKeyDown, preventScroll]);

  if (!isOpen) return null;

  const resolvedBackdropClass = backdropClassName
    ? backdropClassName
    : BACKDROP_STYLES[backdropVariant];

  const resolvedSizeClass = SIZE_STYLES[size];

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      data-lenis-prevent
      style={{ zIndex }}
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 select-none touch-pan-y"
    >
      <div
        className={`fixed inset-0 transition-opacity duration-300 animate-modal-backdrop cursor-pointer ${resolvedBackdropClass}`}
        onClick={closeOnBackdropClick ? onClose : undefined}
      />

      {showCloseButton && closeButtonPosition === 'outside' && (
        <button
          type="button"
          onClick={onClose}
          className={`fixed top-4 right-4 z-50 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white backdrop-blur-md transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 ${closeButtonClassName}`}
          title="Close (Esc)"
          aria-label="Close modal"
        >
          <HiXMark className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
        </button>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        data-lenis-prevent
        className={`relative z-10 w-full ${resolvedSizeClass} animate-modal-content transition-all ${className}`}
      >
        {(title || description || (showCloseButton && closeButtonPosition === 'inside')) && !className.includes('bg-') ? (
          <div className={`bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col ${contentClassName}`}>
            {(title || (showCloseButton && closeButtonPosition === 'inside')) && (
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-3 min-w-0">
                  {icon && (
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    {title && (
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                        {title}
                      </h3>
                    )}
                    {description && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {description}
                      </p>
                    )}
                  </div>
                </div>

                {showCloseButton && closeButtonPosition === 'inside' && (
                  <button
                    type="button"
                    onClick={onClose}
                    className={`p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer ${closeButtonClassName}`}
                    title="Close"
                    aria-label="Close modal"
                  >
                    <HiXMark className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            <div
              data-lenis-prevent
              className="p-4 sm:p-5 overflow-y-auto max-h-[82vh] touch-pan-y overscroll-contain"
            >
              {children}
            </div>
          </div>
        ) : (
          <div className="relative">
            {showCloseButton && closeButtonPosition === 'inside' && (
              <button
                type="button"
                onClick={onClose}
                className={`absolute top-3 right-3 z-30 p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer ${closeButtonClassName}`}
                title="Close"
                aria-label="Close modal"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            )}
            {children}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

Modal.Header = function ModalHeader({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 ${className}`}
    >
      {children}
    </div>
  );
};

Modal.Body = function ModalBody({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`p-4 sm:p-5 overflow-y-auto ${className}`}>{children}</div>
  );
};

Modal.Footer = function ModalFooter({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5 ${className}`}
    >
      {children}
    </div>
  );
};
