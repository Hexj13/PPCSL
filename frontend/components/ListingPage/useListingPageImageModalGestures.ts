'use client';

import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from 'react';

import { getPinchDistance } from './listing-page-image-modal-pinch';

type ZoomState = { scale: number; x: number; y: number };

type UseListingPageImageModalGesturesParams = {
  isOpen: boolean;
  isMobileViewport: boolean;
  swipeContainerRef: RefObject<HTMLDivElement | null>;
  swipeHandledRef: MutableRefObject<boolean>;
  swipeTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  syncClickLockRef: MutableRefObject<boolean>;
  visibleIndexRef: MutableRefObject<number>;
  currentIndexRef: MutableRefObject<number>;
  isOpenRef: MutableRefObject<boolean>;
  onNextRef: MutableRefObject<() => void>;
  onPrevRef: MutableRefObject<() => void>;
  imagesLength: number;
  currentIndex: number;
};

export function useListingPageImageModalGestures({
  isOpen,
  isMobileViewport,
  swipeContainerRef,
  swipeHandledRef,
  swipeTimeoutRef,
  syncClickLockRef,
  visibleIndexRef,
  currentIndexRef,
  isOpenRef,
  onNextRef,
  onPrevRef,
  imagesLength,
  currentIndex,
}: UseListingPageImageModalGesturesParams) {
  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, x: 0, y: 0 });
  const zoomRef = useRef<ZoomState>({ scale: 1, x: 0, y: 0 });
  zoomRef.current = zoom;
  const pinchStartZoomRef = useRef<ZoomState>({ scale: 1, x: 0, y: 0 });
  const pinchStartDistRef = useRef(0);
  const pinchCenterRef = useRef({ x: 0, y: 0 });
  const containerRectRef = useRef<DOMRect | null>(null);
  const isPinchingRef = useRef(false);
  const panStartRef = useRef<{
    touchX: number;
    touchY: number;
    zoomX: number;
    zoomY: number;
  } | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const imagesLengthRef = useRef(imagesLength);
  imagesLengthRef.current = imagesLength;
  const minSwipeDistance = 50;

  useEffect(() => {
    if (!isOpen) setZoom({ scale: 1, x: 0, y: 0 });
  }, [isOpen]);

  useEffect(() => {
    setZoom({ scale: 1, x: 0, y: 0 });
  }, [currentIndex]);

  useEffect(() => {
    const container = swipeContainerRef.current;
    if (!isOpen || !container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (isMobileViewport && e.touches.length === 2) {
        isPinchingRef.current = true;
        pinchStartDistRef.current = getPinchDistance(e.touches[0], e.touches[1]);
        pinchStartZoomRef.current = { ...zoomRef.current };
        pinchCenterRef.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        containerRectRef.current = swipeContainerRef.current?.getBoundingClientRect() ?? null;
        panStartRef.current = null;
        touchStartX.current = null;
        touchEndX.current = null;
      } else if (e.touches.length === 1) {
        touchEndX.current = null;
        touchStartX.current = e.touches[0].clientX;
        if (zoomRef.current.scale > 1) {
          panStartRef.current = {
            touchX: e.touches[0].clientX,
            touchY: e.touches[0].clientY,
            zoomX: zoomRef.current.x,
            zoomY: zoomRef.current.y,
          };
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isMobileViewport && e.touches.length === 2 && isPinchingRef.current) {
        e.preventDefault();
        const dist = getPinchDistance(e.touches[0], e.touches[1]);
        const ratio = dist / pinchStartDistRef.current;
        const newScale = Math.min(4, Math.max(1, pinchStartZoomRef.current.scale * ratio));
        const rect = containerRectRef.current;
        const { x: x0, y: y0, scale: s0 } = pinchStartZoomRef.current;
        const { x: mx, y: my } = pinchCenterRef.current;
        const scaleRatio = newScale / s0;
        const newX = rect ? (mx - rect.left) * (1 - scaleRatio) + x0 * scaleRatio : x0;
        const newY = rect ? (my - rect.top) * (1 - scaleRatio) + y0 * scaleRatio : y0;
        const newZoom = { scale: newScale, x: newX, y: newY };
        zoomRef.current = newZoom;
        setZoom(newZoom);
        return;
      }
      if (e.touches.length === 1) {
        if (zoomRef.current.scale > 1 && panStartRef.current) {
          e.preventDefault();
          const dx = e.touches[0].clientX - panStartRef.current.touchX;
          const dy = e.touches[0].clientY - panStartRef.current.touchY;
          const scale = zoomRef.current.scale || 1;
          const newZoom = {
            ...zoomRef.current,
            x: panStartRef.current.zoomX + dx / scale,
            y: panStartRef.current.zoomY + dy / scale,
          };
          zoomRef.current = newZoom;
          setZoom(newZoom);
          return;
        }
        touchEndX.current = e.touches[0].clientX;
      }
    };

    const finishPinch = () => {
      isPinchingRef.current = false;
      if (zoomRef.current.scale < 1.05) {
        const resetZoom = { scale: 1, x: 0, y: 0 };
        zoomRef.current = resetZoom;
        setZoom(resetZoom);
      }
      panStartRef.current = null;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isPinchingRef.current && e.touches.length < 2) {
        finishPinch();
        return;
      }
      if (zoomRef.current.scale > 1) {
        panStartRef.current = null;
        return;
      }
      if (!touchStartX.current || !touchEndX.current) return;
      const distance = touchStartX.current - touchEndX.current;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isLeftSwipe && imagesLengthRef.current > 1) {
        if (
          isOpenRef.current &&
          (syncClickLockRef.current || visibleIndexRef.current !== currentIndexRef.current)
        ) {
          return;
        }
        swipeHandledRef.current = true;
        onNextRef.current();
        if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current);
        swipeTimeoutRef.current = setTimeout(() => {
          swipeHandledRef.current = false;
        }, 400);
      }
      if (isRightSwipe && imagesLengthRef.current > 1) {
        if (
          isOpenRef.current &&
          (syncClickLockRef.current || visibleIndexRef.current !== currentIndexRef.current)
        ) {
          return;
        }
        swipeHandledRef.current = true;
        onPrevRef.current();
        if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current);
        swipeTimeoutRef.current = setTimeout(() => {
          swipeHandledRef.current = false;
        }, 400);
      }
    };

    const handleTouchCancel = (e: TouchEvent) => {
      if (isPinchingRef.current && e.touches.length < 2) {
        finishPinch();
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [
    currentIndexRef,
    isMobileViewport,
    isOpen,
    isOpenRef,
    onNextRef,
    onPrevRef,
    swipeContainerRef,
    swipeHandledRef,
    swipeTimeoutRef,
    syncClickLockRef,
    visibleIndexRef,
  ]);

  return { zoom };
}
