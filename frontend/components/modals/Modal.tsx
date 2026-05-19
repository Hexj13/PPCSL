'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { useHistoryBackClose } from '@/hooks/useHistoryBackClose';
import { useScrollLock } from '@/hooks/useScrollLock';
import { designTokens } from '@/ui';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'full';
  className?: string;
  /** When false, no border under the title bar (default: true). */
  titleBottomBorder?: boolean;
  dataTestId?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  className = '',
  titleBottomBorder = true,
  dataTestId,
}: ModalProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const pointerStartedOnBackdropRef = useRef(false);
  const overlayHistoryId = useId();

  useScrollLock(isOpen);
  useHistoryBackClose(isOpen, onClose, overlayHistoryId);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
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
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 sm:p-6 md:p-8"
      style={{ zIndex: designTokens.zIndex.modal }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCloseRef.current();
          return;
        }
        if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
          e.preventDefault();
          onCloseRef.current();
        }
      }}
      onPointerDown={(e) => {
        pointerStartedOnBackdropRef.current = e.target === e.currentTarget;
      }}
      onPointerUp={(e) => {
        if (e.target === e.currentTarget && pointerStartedOnBackdropRef.current) {
          onCloseRef.current();
        }
        pointerStartedOnBackdropRef.current = false;
      }}
    >
      <div
        className={`bg-bg-base rounded-lg w-full ${sizeClasses[size]} flex max-h-[90vh] flex-col overflow-hidden scrollbar-custom ${className}`}
        data-testid={dataTestId}
      >
        {title && (
          <div
            className={`shrink-0 bg-bg-base p-5 sm:p-6 flex justify-between items-center ${
              titleBottomBorder ? 'border-b border-primary-700' : ''
            }`}
          >
            <h2 className="text-2xl font-bold text-primary-900">{title}</h2>
            <button
              onClick={() => onCloseRef.current()}
              className="text-primary-700 hover-only:hover:text-primary-900 text-4xl transition-colors"
            >
              ×
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
