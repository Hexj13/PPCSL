'use client';

import { useEffect, useRef, useState } from 'react';

type LayoutViewportSize = {
  height: number;
  width: number;
};

const KEYBOARD_CLOSE_STABILIZATION_MS = 120;

export interface BottomSheetViewportRect {
  height: number;
  keyboardInsetBottom: number;
  layoutHeight: number;
  layoutWidth: number;
  offsetLeft: number;
  offsetTop: number;
  width: number;
}

const EMPTY_VIEWPORT_RECT: BottomSheetViewportRect = {
  height: 0,
  keyboardInsetBottom: 0,
  layoutHeight: 0,
  layoutWidth: 0,
  offsetLeft: 0,
  offsetTop: 0,
  width: 0,
};

function isTransientKeyboardClose(
  previousRect: BottomSheetViewportRect,
  nextRect: BottomSheetViewportRect,
): boolean {
  return (
    previousRect.keyboardInsetBottom > 0 &&
    nextRect.keyboardInsetBottom === 0 &&
    nextRect.height > previousRect.height
  );
}

function readViewportRect(previousLayoutSize?: LayoutViewportSize): BottomSheetViewportRect {
  if (typeof window === 'undefined') {
    return EMPTY_VIEWPORT_RECT;
  }
  const viewport = window.visualViewport;
  const offsetLeft = viewport?.offsetLeft ?? 0;
  const offsetTop = viewport?.offsetTop ?? 0;
  const height = viewport?.height ?? window.innerHeight;
  const width = viewport?.width ?? window.innerWidth;
  const documentElement = window.document.documentElement;
  const layoutHeight = Math.max(
    window.innerHeight,
    documentElement.clientHeight,
    offsetTop + height,
    previousLayoutSize?.height ?? 0,
  );
  const layoutWidth = Math.max(
    window.innerWidth,
    documentElement.clientWidth,
    offsetLeft + width,
    previousLayoutSize?.width ?? 0,
  );

  return {
    height,
    keyboardInsetBottom: Math.max(0, Math.round(layoutHeight - (offsetTop + height))),
    layoutHeight,
    layoutWidth,
    offsetLeft,
    offsetTop,
    width,
  };
}

export function useBottomSheetViewportRect(enabled: boolean): BottomSheetViewportRect {
  const [rect, setRect] = useState(() => (enabled ? readViewportRect() : EMPTY_VIEWPORT_RECT));
  const rectRef = useRef(rect);
  const keyboardCloseTimerRef = useRef<number | null>(null);
  const layoutViewportSizeRef = useRef<LayoutViewportSize>({
    height: rect.layoutHeight,
    width: rect.layoutWidth,
  });

  useEffect(() => {
    const clearKeyboardCloseTimer = () => {
      if (keyboardCloseTimerRef.current) {
        clearTimeout(keyboardCloseTimerRef.current);
        keyboardCloseTimerRef.current = null;
      }
    };

    const applyRect = (nextRect: BottomSheetViewportRect) => {
      const previousRect = rectRef.current;

      if (isTransientKeyboardClose(previousRect, nextRect)) {
        clearKeyboardCloseTimer();
        keyboardCloseTimerRef.current = window.setTimeout(() => {
          keyboardCloseTimerRef.current = null;
          rectRef.current = nextRect;
          setRect(nextRect);
        }, KEYBOARD_CLOSE_STABILIZATION_MS);
        return;
      }

      clearKeyboardCloseTimer();
      rectRef.current = nextRect;
      setRect(nextRect);
    };

    if (!enabled) {
      clearKeyboardCloseTimer();
      rectRef.current = EMPTY_VIEWPORT_RECT;
      layoutViewportSizeRef.current = { height: 0, width: 0 };
      setRect(EMPTY_VIEWPORT_RECT);
      return undefined;
    }

    const viewport = window.visualViewport;
    let rafId = 0;
    const readAndStoreRect = () => {
      const nextRect = readViewportRect(layoutViewportSizeRef.current);
      layoutViewportSizeRef.current = {
        height: nextRect.layoutHeight,
        width: nextRect.layoutWidth,
      };
      return nextRect;
    };
    const scheduleUpdate = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        applyRect(readAndStoreRect());
      });
    };

    applyRect(readAndStoreRect());
    viewport?.addEventListener('resize', scheduleUpdate);
    viewport?.addEventListener('scroll', scheduleUpdate);
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      clearKeyboardCloseTimer();
      viewport?.removeEventListener('resize', scheduleUpdate);
      viewport?.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [enabled]);

  return rect;
}
