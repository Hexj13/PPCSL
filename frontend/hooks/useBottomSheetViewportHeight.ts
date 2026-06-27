'use client';

import { useEffect, useRef, useState } from 'react';

const KEYBOARD_CLOSE_STABILIZATION_MS = 120;

export interface BottomSheetViewportRect {
  height: number;
  keyboardInsetBottom: number;
}

const EMPTY_VIEWPORT_RECT: BottomSheetViewportRect = {
  height: 0,
  keyboardInsetBottom: 0,
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

function readVisualMetrics(): { height: number; visualBottom: number } {
  if (typeof window === 'undefined') {
    return { height: 0, visualBottom: 0 };
  }
  const viewport = window.visualViewport;
  const height = viewport?.height ?? window.innerHeight;
  const offsetTop = viewport?.offsetTop ?? 0;
  return { height, visualBottom: offsetTop + height };
}

export function useBottomSheetViewportRect(enabled: boolean): BottomSheetViewportRect {
  const [rect, setRect] = useState(EMPTY_VIEWPORT_RECT);
  const rectRef = useRef(rect);
  const baselineBottomRef = useRef(0);
  const keyboardCloseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const clearKeyboardCloseTimer = () => {
      if (keyboardCloseTimerRef.current) {
        clearTimeout(keyboardCloseTimerRef.current);
        keyboardCloseTimerRef.current = null;
      }
    };

    if (!enabled) {
      clearKeyboardCloseTimer();
      baselineBottomRef.current = 0;
      rectRef.current = EMPTY_VIEWPORT_RECT;
      setRect(EMPTY_VIEWPORT_RECT);
      return undefined;
    }

    const computeRect = (): BottomSheetViewportRect => {
      const { height, visualBottom } = readVisualMetrics();
      baselineBottomRef.current = Math.max(baselineBottomRef.current, visualBottom);
      const keyboardInsetBottom = Math.max(0, Math.round(baselineBottomRef.current - visualBottom));
      return { height, keyboardInsetBottom };
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

    baselineBottomRef.current = 0;

    const viewport = window.visualViewport;
    let rafId = 0;
    const scheduleUpdate = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        applyRect(computeRect());
      });
    };

    applyRect(computeRect());
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
