'use client';

import { useEffect, useState } from 'react';

export interface BottomSheetViewportRect {
  height: number;
  offsetLeft: number;
  offsetTop: number;
  width: number;
}

const EMPTY_VIEWPORT_RECT: BottomSheetViewportRect = {
  height: 0,
  offsetLeft: 0,
  offsetTop: 0,
  width: 0,
};

function readViewportRect(): BottomSheetViewportRect {
  if (typeof window === 'undefined') {
    return EMPTY_VIEWPORT_RECT;
  }
  const viewport = window.visualViewport;
  return {
    height: viewport?.height ?? window.innerHeight,
    offsetLeft: viewport?.offsetLeft ?? 0,
    offsetTop: viewport?.offsetTop ?? 0,
    width: viewport?.width ?? window.innerWidth,
  };
}

export function useBottomSheetViewportRect(enabled: boolean): BottomSheetViewportRect {
  const [rect, setRect] = useState(() => (enabled ? readViewportRect() : EMPTY_VIEWPORT_RECT));

  useEffect(() => {
    if (!enabled) {
      setRect(EMPTY_VIEWPORT_RECT);
      return undefined;
    }

    const viewport = window.visualViewport;
    const update = () => {
      setRect(readViewportRect());
    };

    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [enabled]);

  return rect;
}
