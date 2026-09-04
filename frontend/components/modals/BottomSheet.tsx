'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useHistoryBackClose } from '@/hooks/useHistoryBackClose';
import { useScrollLock } from '@/hooks/useScrollLock';
import { BOTTOM_SHEET_TRANSITION_MS, getBottomSheetSlideStyle } from '@/lib/bottom-sheet-layout';
import { designTokens } from '@/ui';

const BOTTOM_SHEET_SLIDE_CLASS =
  'motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  dataTestId?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  dataTestId,
}: BottomSheetProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const titleId = useId();
  const overlayHistoryId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const pointerStartedOnBackdropRef = useRef(false);
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useScrollLock(isRendered);
  useHistoryBackClose(isOpen, onClose, overlayHistoryId);
  useFocusTrap(panelRef, isRendered && isVisible);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      let innerRaf = 0;
      const outerRaf = requestAnimationFrame(() => {
        innerRaf = requestAnimationFrame(() => setIsVisible(true));
      });
      return () => {
        cancelAnimationFrame(outerRaf);
        if (innerRaf) {
          cancelAnimationFrame(innerRaf);
        }
      };
    }

    setIsVisible(false);
    if (prefersReducedMotion()) {
      setIsRendered(false);
      return undefined;
    }
    const timer = setTimeout(() => setIsRendered(false), BOTTOM_SHEET_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isRendered) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isRendered]);

  if (!isRendered || typeof window === 'undefined') {
    return null;
  }

  const sheetContent = (
    <div
      className={`fixed inset-0 flex items-end justify-center px-4 bg-black/70 motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        zIndex: designTokens.zIndex.modal,
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
      role="presentation"
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
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        data-testid={dataTestId}
        className={`w-full max-w-lg bg-bg-base rounded-t-2xl border border-primary-700/30 border-b-0 shadow-xl ${BOTTOM_SHEET_SLIDE_CLASS} ${className}`}
        style={getBottomSheetSlideStyle(isVisible)}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <span className="block h-1 w-10 rounded-full bg-primary-700/40" />
        </div>
        {title && (
          <div className="px-5 pb-3 pt-1 border-b border-primary-700/30">
            <h2 id={titleId} className="text-lg font-bold text-primary-900 sm:text-xl">
              {title}
            </h2>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );

  return createPortal(sheetContent, document.body);
}
