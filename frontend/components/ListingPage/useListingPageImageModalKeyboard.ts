'use client';

import { useEffect, type MutableRefObject } from 'react';

import { clearImageNavGuard } from './listing-image-nav-guard';

type UseListingPageImageModalKeyboardParams = {
  isOpen: boolean;
  onClose: () => void;
  onNextRef: MutableRefObject<() => void>;
  onPrevRef: MutableRefObject<() => void>;
  syncClickLockRef: MutableRefObject<boolean>;
  syncUnlockTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  swipeHandledRef: MutableRefObject<boolean>;
  swipeTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
};

export function useListingPageImageModalKeyboard({
  isOpen,
  onClose,
  onNextRef,
  onPrevRef,
  syncClickLockRef,
  syncUnlockTimeoutRef,
  swipeHandledRef,
  swipeTimeoutRef,
}: UseListingPageImageModalKeyboardParams): void {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive = target.closest('button, [href]');
      if (e.key === 'Escape') {
        onClose();
      }
      if ((e.key === 'Enter' || e.key === ' ') && !isInteractive) {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'ArrowLeft') {
        onPrevRef.current();
      }
      if (e.key === 'ArrowRight') {
        onNextRef.current();
      }
    };

    const preventScroll = (e: TouchEvent) => {
      if (e.touches.length > 1) return;
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchmove', preventScroll);
      clearImageNavGuard(syncClickLockRef, syncUnlockTimeoutRef);
      if (swipeTimeoutRef.current) {
        clearTimeout(swipeTimeoutRef.current);
        swipeTimeoutRef.current = null;
      }
      swipeHandledRef.current = false;
    };
  }, [
    isOpen,
    onClose,
    onNextRef,
    onPrevRef,
    swipeHandledRef,
    swipeTimeoutRef,
    syncClickLockRef,
    syncUnlockTimeoutRef,
  ]);
}
