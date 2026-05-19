'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useHistoryBackClose } from '@/hooks/useHistoryBackClose';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useTranslation } from '@/hooks/useTranslation';
import { designTokens } from '@/ui';

const MOBILE_SHEET_MAX_WIDTH_PX = 767;
const CLOSE_TRANSITION_FALLBACK_MS = 380;

function useMobileSheetViewport(): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(`(max-width: ${MOBILE_SHEET_MAX_WIDTH_PX}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_SHEET_MAX_WIDTH_PX}px)`);
    const handler = () => setMatches(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return matches;
}

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  lockSheetHeight?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  lockSheetHeight = false,
}: BottomSheetProps) {
  const { t } = useTranslation();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragDY = useRef(0);
  const pointerStartedOnBackdropRef = useRef(false);
  const internalClosePendingRef = useRef(false);
  const closeFallbackTimerRef = useRef<number | null>(null);
  const [slideReady, setSlideReady] = useState(false);
  const [portalMounted, setPortalMounted] = useState(isOpen);
  const isMobileViewport = useMobileSheetViewport();
  const overlayHistoryId = useId();

  useScrollLock(portalMounted && isMobileViewport);

  const clearCloseFallback = useCallback(() => {
    if (closeFallbackTimerRef.current) {
      clearTimeout(closeFallbackTimerRef.current);
      closeFallbackTimerRef.current = null;
    }
  }, []);

  const finishCloseAnimation = useCallback(() => {
    clearCloseFallback();
    if (internalClosePendingRef.current) {
      internalClosePendingRef.current = false;
      onCloseRef.current();
    }
    setPortalMounted(false);
  }, [clearCloseFallback]);

  const beginClose = useCallback(() => {
    if (!portalMounted || internalClosePendingRef.current) return;
    internalClosePendingRef.current = true;
    dragDY.current = 0;
    dragStartY.current = null;
    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setSlideReady(false);

    if (reduced) {
      requestAnimationFrame(() => {
        finishCloseAnimation();
      });
      return;
    }

    clearCloseFallback();
    closeFallbackTimerRef.current = window.setTimeout(() => {
      closeFallbackTimerRef.current = null;
      finishCloseAnimation();
    }, CLOSE_TRANSITION_FALLBACK_MS);
  }, [clearCloseFallback, finishCloseAnimation, portalMounted]);

  useHistoryBackClose(isOpen && isMobileViewport, beginClose, overlayHistoryId);

  const handleSheetPanelTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.propertyName !== 'transform') return;
      if (slideReady) return;
      clearCloseFallback();
      finishCloseAnimation();
    },
    [clearCloseFallback, finishCloseAnimation, slideReady],
  );

  useEffect(() => {
    if (isOpen && !isMobileViewport) {
      onCloseRef.current();
    }
  }, [isOpen, isMobileViewport]);

  useEffect(() => {
    if (isOpen) {
      setPortalMounted(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isMobileViewport) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        beginClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [beginClose, isOpen, isMobileViewport]);

  useEffect(() => {
    if (!isOpen) {
      dragDY.current = 0;
      if (sheetRef.current) {
        sheetRef.current.style.transform = '';
      }
      clearCloseFallback();
    }
  }, [clearCloseFallback, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSlideReady(false);
      return;
    }
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => setSlideReady(true));
    });
    return () => {
      cancelAnimationFrame(outerRaf);
      if (innerRaf) cancelAnimationFrame(innerRaf);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && portalMounted) {
      clearCloseFallback();
      closeFallbackTimerRef.current = window.setTimeout(() => {
        closeFallbackTimerRef.current = null;
        finishCloseAnimation();
      }, CLOSE_TRANSITION_FALLBACK_MS);
      return () => {
        clearCloseFallback();
      };
    }
  }, [isOpen, portalMounted, finishCloseAnimation, clearCloseFallback]);

  useEffect(
    () => () => {
      clearCloseFallback();
    },
    [clearCloseFallback],
  );

  if (!portalMounted) {
    return null;
  }

  if (!isMobileViewport) {
    return null;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const closingFromProp = portalMounted && !isOpen;

  const content = (
    <div
      className={`fixed inset-0 ${closingFromProp ? 'pointer-events-none' : 'pointer-events-auto'}`}
      style={{ zIndex: designTokens.zIndex.modal }}
      role="presentation"
    >
      <div
        className={`absolute inset-0 bg-black/70 motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-out ${
          slideReady ? 'opacity-100' : 'opacity-0'
        } motion-reduce:opacity-100 touch-manipulation`}
        onPointerDown={(e) => {
          e.stopPropagation();
          pointerStartedOnBackdropRef.current = e.target === e.currentTarget;
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          if (e.target === e.currentTarget && pointerStartedOnBackdropRef.current) {
            beginClose();
          }
          pointerStartedOnBackdropRef.current = false;
        }}
      />
      <div
        onTransitionEnd={handleSheetPanelTransitionEnd}
        className={`pointer-events-none absolute bottom-0 left-0 right-0 flex justify-center motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out will-change-transform ${
          slideReady ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div
          ref={sheetRef}
          className={`flex min-h-0 w-full flex-col overflow-hidden rounded-t-xl bg-bg-base shadow-xl motion-safe:transition-transform motion-safe:duration-200 ${
            closingFromProp ? 'pointer-events-none' : 'pointer-events-auto'
          } ${
            lockSheetHeight
              ? 'min-h-[min(88vh,860px)] max-h-[min(92vh,900px)]'
              : 'max-h-[min(92vh,900px)]'
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="bottom-sheet-title"
          onPointerDown={(e) => {
            const el = e.target as HTMLElement;
            if (el.closest('[data-bottom-sheet-handle]')) {
              dragStartY.current = e.clientY;
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                /* noop */
              }
            }
          }}
          onPointerMove={(e) => {
            if (dragStartY.current === null) return;
            const dy = e.clientY - dragStartY.current;
            dragDY.current = Math.max(0, dy);
            if (sheetRef.current) {
              sheetRef.current.style.transform = `translateY(${dragDY.current}px)`;
            }
          }}
          onPointerUp={(e) => {
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
              /* noop */
            }
            if (dragStartY.current !== null && dragDY.current > 80) {
              beginClose();
            } else if (sheetRef.current) {
              sheetRef.current.style.transform = '';
            }
            dragStartY.current = null;
            dragDY.current = 0;
          }}
          onPointerCancel={(e) => {
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
              /* noop */
            }
            dragStartY.current = null;
            dragDY.current = 0;
            if (sheetRef.current) {
              sheetRef.current.style.transform = '';
            }
          }}
        >
          <div
            data-bottom-sheet-handle
            className="flex shrink-0 justify-center pt-2 pb-1 cursor-grab touch-none active:cursor-grabbing"
          >
            <span className="h-1 w-10 rounded-full bg-primary-500/35" aria-hidden />
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-primary-500/20 px-4 pb-3">
            <h2 id="bottom-sheet-title" className="truncate text-lg font-bold text-primary-900">
              {title}
            </h2>
            <button
              type="button"
              onClick={() => beginClose()}
              className="shrink-0 p-1 text-3xl leading-none text-primary-700 hover-only:hover:text-primary-900"
              aria-label={t('common.close')}
            >
              ×
            </button>
          </div>
          <div
            className={
              lockSheetHeight
                ? 'flex min-h-0 flex-1 flex-col overflow-hidden overscroll-y-contain'
                : 'min-h-0 shrink-0 overflow-x-hidden overscroll-y-contain pb-[max(1rem,env(safe-area-inset-bottom))]'
            }
          >
            {children}
          </div>
          {footer ? (
            <div className="shrink-0 border-t border-primary-500/20 bg-bg-base px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
