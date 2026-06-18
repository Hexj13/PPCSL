'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { BottomSheetPanel } from '@/components/common/BottomSheetPanel';
import { useBottomSheetViewportHeight } from '@/hooks/useBottomSheetViewportHeight';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useHistoryBackClose } from '@/hooks/useHistoryBackClose';
import { useTranslation } from '@/hooks/useTranslation';
import {
  BOTTOM_SHEET_TRANSITION_FALLBACK_MS,
  computeBottomSheetLockMinHeightPx,
  computeBottomSheetMaxHeightPx,
} from '@/lib/bottom-sheet-layout';
import { designTokens } from '@/ui';

const MOBILE_SHEET_MAX_WIDTH_PX = 767;
const BOTTOM_SHEET_SCROLLABLE_SELECTOR = '[data-bottom-sheet-scrollable="true"]';

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

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function getBottomSheetScrollable(target: EventTarget | null, sheet: HTMLElement | null) {
  if (!(target instanceof Element) || !sheet) {
    return null;
  }
  const scrollable = target.closest(BOTTOM_SHEET_SCROLLABLE_SELECTOR);
  if (!(scrollable instanceof HTMLElement) || !sheet.contains(scrollable)) {
    return null;
  }
  return scrollable;
}

function canScroll(scrollable: HTMLElement, deltaY: number): boolean {
  if (deltaY === 0) {
    return true;
  }
  if (deltaY < 0) {
    return scrollable.scrollTop > 0;
  }
  return Math.ceil(scrollable.scrollTop + scrollable.clientHeight) < scrollable.scrollHeight;
}

function preventScrollEvent(e: Event) {
  if (e.cancelable) {
    e.preventDefault();
  }
  e.stopPropagation();
}

function useBlockBackgroundScroll(enabled: boolean, sheetRef: React.RefObject<HTMLElement | null>) {
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const handleWheel = (e: WheelEvent) => {
      const scrollable = getBottomSheetScrollable(e.target, sheetRef.current);
      if (!scrollable || !canScroll(scrollable, e.deltaY)) {
        preventScrollEvent(e);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0]?.clientY;
      const startY = touchStartYRef.current;
      if (currentY === undefined || startY === null) {
        preventScrollEvent(e);
        return;
      }

      const deltaY = startY - currentY;
      const scrollable = getBottomSheetScrollable(e.target, sheetRef.current);
      if (!scrollable || !canScroll(scrollable, deltaY)) {
        preventScrollEvent(e);
        return;
      }
      touchStartYRef.current = currentY;
    };

    document.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
    document.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false });

    return () => {
      document.removeEventListener('wheel', handleWheel, { capture: true });
      document.removeEventListener('touchstart', handleTouchStart, { capture: true });
      document.removeEventListener('touchmove', handleTouchMove, { capture: true });
      touchStartYRef.current = null;
    };
  }, [enabled, sheetRef]);
}

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  lockSheetHeight?: boolean;
  dataTestId?: string;
  mobileOnly?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  lockSheetHeight = false,
  dataTestId,
  mobileOnly = true,
}: BottomSheetProps) {
  const { t } = useTranslation();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragDY = useRef(0);
  const notifyParentOnExitRef = useRef(false);
  const exitInProgressRef = useRef(false);
  const exitFallbackTimerRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(false);
  const isMobileViewport = useMobileSheetViewport();
  const wantShow = isOpen && (mobileOnly ? isMobileViewport : true);
  const viewportHeightPx = useBottomSheetViewportHeight(
    mounted && (mobileOnly ? isMobileViewport : true),
  );
  const overlayHistoryId = useId();
  const sheetActive = mounted && (mobileOnly ? isMobileViewport : true);
  const exiting = mounted && !visible;

  useFocusTrap(sheetRef, sheetActive && visible);
  useBlockBackgroundScroll(sheetActive, sheetRef);

  const clearExitFallback = useCallback(() => {
    if (exitFallbackTimerRef.current) {
      clearTimeout(exitFallbackTimerRef.current);
      exitFallbackTimerRef.current = null;
    }
  }, []);

  const resetDragState = useCallback(() => {
    dragDY.current = 0;
    dragStartY.current = null;
    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
  }, []);

  const completeExit = useCallback(() => {
    clearExitFallback();
    exitInProgressRef.current = false;
    const shouldNotifyParent = notifyParentOnExitRef.current;
    notifyParentOnExitRef.current = false;
    resetDragState();
    setVisible(false);
    setMounted(false);
    if (shouldNotifyParent) {
      onCloseRef.current();
    }
  }, [clearExitFallback, resetDragState]);

  const startExit = useCallback(
    (notifyParent: boolean) => {
      if (!mounted || exitInProgressRef.current) {
        return;
      }
      exitInProgressRef.current = true;
      notifyParentOnExitRef.current = notifyParent;
      resetDragState();
      setVisible(false);

      if (prefersReducedMotion()) {
        requestAnimationFrame(() => {
          completeExit();
        });
        return;
      }

      clearExitFallback();
      exitFallbackTimerRef.current = window.setTimeout(() => {
        exitFallbackTimerRef.current = null;
        completeExit();
      }, BOTTOM_SHEET_TRANSITION_FALLBACK_MS);
    },
    [clearExitFallback, completeExit, mounted, resetDragState],
  );

  const requestCloseFromUser = useCallback(() => {
    startExit(true);
  }, [startExit]);

  useHistoryBackClose(sheetActive, requestCloseFromUser, overlayHistoryId);

  const handleSheetPanelTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.propertyName !== 'transform') return;
      if (visible) return;
      if (!exitInProgressRef.current) return;
      clearExitFallback();
      completeExit();
    },
    [clearExitFallback, completeExit, visible],
  );

  const handleDragPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    if (!el.closest('[data-bottom-sheet-handle]')) {
      return;
    }
    dragStartY.current = e.clientY;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }, []);

  const handleDragPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return;
    const dy = e.clientY - dragStartY.current;
    dragDY.current = Math.max(0, dy);
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dragDY.current}px)`;
    }
  }, []);

  const handleDragPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      if (dragStartY.current !== null && dragDY.current > 80) {
        requestCloseFromUser();
      } else if (sheetRef.current) {
        sheetRef.current.style.transform = '';
      }
      dragStartY.current = null;
      dragDY.current = 0;
    },
    [requestCloseFromUser],
  );

  const handleDragPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
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
  }, []);

  useEffect(() => {
    if (mobileOnly && isOpen && !isMobileViewport) {
      onCloseRef.current();
    }
  }, [isOpen, isMobileViewport, mobileOnly]);

  useEffect(() => {
    if (wantShow) {
      exitInProgressRef.current = false;
      notifyParentOnExitRef.current = false;
      setMounted(true);
    }
  }, [wantShow]);

  useEffect(() => {
    if (!mounted || !wantShow) {
      return undefined;
    }
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => setVisible(true));
    });
    return () => {
      cancelAnimationFrame(outerRaf);
      if (innerRaf) {
        cancelAnimationFrame(innerRaf);
      }
    };
  }, [mounted, wantShow]);

  useEffect(() => {
    if (wantShow || !mounted) {
      return;
    }
    startExit(false);
  }, [wantShow, mounted, startExit]);

  useEffect(() => {
    if (!mounted || (mobileOnly && !isMobileViewport)) {
      return undefined;
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        requestCloseFromUser();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileViewport, mobileOnly, mounted, requestCloseFromUser]);

  useEffect(
    () => () => {
      clearExitFallback();
    },
    [clearExitFallback],
  );

  if (!mounted || (mobileOnly && !isMobileViewport) || typeof window === 'undefined') {
    return null;
  }

  const maxHeightPx =
    viewportHeightPx > 0 ? computeBottomSheetMaxHeightPx(viewportHeightPx) : undefined;
  const lockMinHeightPx =
    lockSheetHeight && viewportHeightPx > 0
      ? computeBottomSheetLockMinHeightPx(viewportHeightPx)
      : undefined;

  const panelStyle: React.CSSProperties = {
    ...(maxHeightPx ? { maxHeight: `${maxHeightPx}px` } : {}),
    ...(lockMinHeightPx ? { minHeight: `${lockMinHeightPx}px` } : {}),
  };

  const content = (
    <div
      data-testid="bottom-sheet-overlay"
      className="fixed inset-0 overscroll-none pointer-events-auto"
      style={{ zIndex: designTokens.zIndex.modal }}
      role="presentation"
    >
      <button
        type="button"
        data-testid="bottom-sheet-backdrop"
        aria-label={t('common.close')}
        className={`absolute inset-0 border-0 p-0 cursor-default bg-black/70 motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        } motion-reduce:opacity-100 touch-none`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          requestCloseFromUser();
        }}
      />
      <BottomSheetPanel
        sheetRef={sheetRef}
        dataTestId={dataTestId}
        panelStyle={panelStyle}
        exiting={exiting}
        visible={visible}
        title={title}
        closeLabel={t('common.close')}
        lockSheetHeight={lockSheetHeight}
        footer={footer}
        onRequestClose={requestCloseFromUser}
        onTransitionEnd={handleSheetPanelTransitionEnd}
        onDragPointerDown={handleDragPointerDown}
        onDragPointerMove={handleDragPointerMove}
        onDragPointerUp={handleDragPointerUp}
        onDragPointerCancel={handleDragPointerCancel}
      >
        {children}
      </BottomSheetPanel>
    </div>
  );

  return createPortal(content, document.body);
}
