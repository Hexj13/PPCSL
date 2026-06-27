'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { BottomSheetPanel } from '@/components/common/BottomSheetPanel';
import {
  type BottomSheetViewportRect,
  useBottomSheetViewportRect,
} from '@/hooks/useBottomSheetViewportHeight';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useHistoryBackClose } from '@/hooks/useHistoryBackClose';
import { useIosKeyboardScrollLock } from '@/hooks/useIosKeyboardScrollLock';
import { useTranslation } from '@/hooks/useTranslation';
import {
  BOTTOM_SHEET_TRANSITION_FALLBACK_MS,
  computeBottomSheetLockMinHeightPx,
  computeBottomSheetMaxHeightPx,
} from '@/lib/bottom-sheet-layout';
import { designTokens } from '@/ui';

const MOBILE_SHEET_MAX_WIDTH_PX = 767;
const BOTTOM_SHEET_SCROLLABLE_SELECTOR = '[data-bottom-sheet-scrollable="true"]';
const BOTTOM_SHEET_BACKDROP_ENTER_EASING_CLASS = 'motion-safe:ease-[cubic-bezier(0.32,0.72,0,1)]';
const BOTTOM_SHEET_BACKDROP_EXIT_EASING_CLASS = 'motion-safe:ease-[cubic-bezier(0.4,0,0.2,1)]';

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

function useBottomSheetPortalRoot(enabled: boolean): HTMLElement | null {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      setPortalRoot(null);
      return undefined;
    }

    const root = document.createElement('div');
    root.dataset.bottomSheetPortalRoot = 'true';
    root.dataset.testid = 'bottom-sheet-portal-root';
    document.body.appendChild(root);
    setPortalRoot(root);

    return () => {
      root.remove();
      setPortalRoot(null);
    };
  }, [enabled]);

  return portalRoot;
}

function getBottomSheetLayout(
  viewportRect: BottomSheetViewportRect,
  lockSheetHeight: boolean,
  lockedViewportRect: BottomSheetViewportRect | null,
  useKeyboardLayout: boolean,
): {
  nextLockedViewportRect: BottomSheetViewportRect | null;
  panelAnchorStyle: React.CSSProperties;
  panelStyle: React.CSSProperties;
  overlayStyle: React.CSSProperties;
} {
  let nextLockedViewportRect = lockedViewportRect;

  if (lockSheetHeight && viewportRect.height > 0) {
    nextLockedViewportRect ??= viewportRect;
  }

  const lockedRect = nextLockedViewportRect ?? viewportRect;
  const keyboardInsetBottomPx = useKeyboardLayout ? viewportRect.keyboardInsetBottom : 0;

  const maxHeightPx =
    viewportRect.height > 0 ? computeBottomSheetMaxHeightPx(viewportRect.height) : undefined;
  const lockedHeightPx =
    lockSheetHeight && lockedRect.height > 0
      ? computeBottomSheetMaxHeightPx(lockedRect.height)
      : undefined;
  const lockMinHeightPx =
    lockSheetHeight && keyboardInsetBottomPx === 0 && lockedRect.height > 0
      ? computeBottomSheetLockMinHeightPx(lockedRect.height)
      : undefined;

  return {
    nextLockedViewportRect: lockSheetHeight ? nextLockedViewportRect : null,
    panelAnchorStyle: {
      bottom: keyboardInsetBottomPx > 0 ? `${keyboardInsetBottomPx}px` : 0,
    },
    panelStyle: {
      ...(maxHeightPx ? { maxHeight: `${maxHeightPx}px` } : {}),
      ...(lockedHeightPx ? { height: `${lockedHeightPx}px` } : {}),
      ...(lockMinHeightPx ? { minHeight: `${lockMinHeightPx}px` } : {}),
    },
    overlayStyle: {
      zIndex: designTokens.zIndex.modal,
    },
  };
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
  const lockedViewportRectRef = useRef<BottomSheetViewportRect | null>(null);
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(false);
  const isMobileViewport = useMobileSheetViewport();
  const wantShow = isOpen && (mobileOnly ? isMobileViewport : true);
  const viewportRect = useBottomSheetViewportRect(
    mounted && (mobileOnly ? isMobileViewport : true),
  );
  const overlayHistoryId = useId();
  const sheetActive = mounted && (mobileOnly ? isMobileViewport : true);
  const useKeyboardLayout = sheetActive && isMobileViewport;
  const exiting = mounted && !visible;
  const portalRoot = useBottomSheetPortalRoot(mounted);

  useFocusTrap(sheetRef, sheetActive && visible);
  useIosKeyboardScrollLock(sheetActive && isMobileViewport, sheetRef);
  useBlockBackgroundScroll(sheetActive, sheetRef);

  useEffect(() => {
    if (!sheetActive || !lockSheetHeight) {
      lockedViewportRectRef.current = null;
    }
  }, [lockSheetHeight, sheetActive]);

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

  if (
    !mounted ||
    (mobileOnly && !isMobileViewport) ||
    typeof window === 'undefined' ||
    !portalRoot
  ) {
    return null;
  }

  const { nextLockedViewportRect, panelAnchorStyle, panelStyle, overlayStyle } =
    getBottomSheetLayout(
      viewportRect,
      lockSheetHeight,
      lockedViewportRectRef.current,
      useKeyboardLayout,
    );
  lockedViewportRectRef.current = nextLockedViewportRect;
  const backdropEasingClass = visible
    ? BOTTOM_SHEET_BACKDROP_ENTER_EASING_CLASS
    : BOTTOM_SHEET_BACKDROP_EXIT_EASING_CLASS;

  const content = (
    <div
      data-testid="bottom-sheet-overlay"
      className="fixed inset-0 overscroll-none pointer-events-auto"
      style={overlayStyle}
      role="presentation"
    >
      <button
        type="button"
        data-testid="bottom-sheet-backdrop"
        aria-label={t('common.close')}
        className={`absolute inset-0 border-0 p-0 cursor-default bg-black/70 motion-safe:transition-opacity motion-safe:duration-300 ${backdropEasingClass} ${
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
        panelAnchorStyle={panelAnchorStyle}
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

  return createPortal(content, portalRoot);
}
