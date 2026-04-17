'use client';

import { useCallback, useRef } from 'react';

import { attachImageInflightListeners, resolveUnderlyingImg } from '@/lib/image-inflight-tracker';

export function useImageInflightRefCallback(): (
  node: HTMLElement | HTMLImageElement | null,
) => void {
  const cleanupRef = useRef<(() => void) | null>(null);
  return useCallback((node: HTMLElement | HTMLImageElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    const img = resolveUnderlyingImg(node);
    if (!img) return;
    cleanupRef.current = attachImageInflightListeners(img);
  }, []);
}
