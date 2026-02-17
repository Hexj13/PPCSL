import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'full';
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  className = '',
}: ModalProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleEscape);

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPaddingRight = document.body.style.paddingRight;
    const computedBodyPaddingRight = window.getComputedStyle(document.body).paddingRight;

    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `calc(${computedBodyPaddingRight} + ${scrollbarWidth}px)`;

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.paddingRight = originalBodyPaddingRight;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  if (typeof window === 'undefined') {
    return null;
  }

  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    full: 'max-w-full',
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4 sm:p-6 md:p-8"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCloseRef.current();
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCloseRef.current();
        }
      }}
    >
      <div
        className={`bg-bg-base rounded-lg w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto scrollbar-custom ${className}`}
      >
        {title && (
          <div className="sticky top-0 z-10 bg-bg-base border-b border-primary-700/30 p-5 sm:p-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-primary-900">{title}</h2>
            <button
              onClick={() => onCloseRef.current()}
              className="text-primary-700 hover:text-primary-900 text-4xl transition-colors"
            >
              ×
            </button>
          </div>
        )}
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
