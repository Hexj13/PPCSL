'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { useHistoryBackClose } from '@/hooks/useHistoryBackClose';
import { useScrollLock } from '@/hooks/useScrollLock';
import { blurhashToDataURL } from '@/lib/utils/blurhash';

import { galleryImageIndexForBlurHash } from './listing-gallery-blur';
import { clearImageNavGuard, tryRunWithSyncImageNavLock } from './listing-image-nav-guard';
import type { ListingPageImageModalProps } from './useListingPageImageModal.types';

const MODAL_PENDING_FALLBACK_MS = 1800;

type UseListingPageImageModalNavigationParams = Pick<
  ListingPageImageModalProps,
  | 'isOpen'
  | 'currentIndex'
  | 'onClose'
  | 'onNext'
  | 'onPrev'
  | 'coverBlurHash'
  | 'imageBlurHashes'
  | 'listingVideoSlide'
>;

export function useListingPageImageModalNavigation({
  isOpen,
  currentIndex,
  onClose,
  onNext,
  onPrev,
  coverBlurHash,
  imageBlurHashes,
  listingVideoSlide,
}: UseListingPageImageModalNavigationParams) {
  const [visibleIndex, setVisibleIndex] = useState(currentIndex);
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const swipeHandledRef = useRef(false);
  const swipeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIsOpenRef = useRef(false);
  const syncClickLockRef = useRef(false);
  const syncUnlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalPendingFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleIndexRef = useRef(visibleIndex);
  const currentIndexRef = useRef(currentIndex);
  visibleIndexRef.current = visibleIndex;
  currentIndexRef.current = currentIndex;
  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const overlayHistoryId = useId();

  useHistoryBackClose(isOpen, onClose, overlayHistoryId);
  useScrollLock(isOpen);

  const getBlurDataURL = useCallback(
    (galleryIndex: number) => {
      const imageIdx = galleryImageIndexForBlurHash(galleryIndex, listingVideoSlide);
      if (imageIdx === null) return undefined;
      const fromArr = imageBlurHashes?.[imageIdx];
      const hash =
        typeof fromArr === 'string' && fromArr.length > 0
          ? fromArr
          : imageIdx === 0 && coverBlurHash && coverBlurHash.length > 0
            ? coverBlurHash
            : undefined;
      if (!hash) return undefined;
      try {
        return blurhashToDataURL(hash);
      } catch {
        return undefined;
      }
    },
    [coverBlurHash, imageBlurHashes, listingVideoSlide],
  );

  useEffect(() => {
    if (!isOpen) {
      clearImageNavGuard(syncClickLockRef, syncUnlockTimeoutRef);
      if (modalPendingFallbackRef.current) clearTimeout(modalPendingFallbackRef.current);
      modalPendingFallbackRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      if (modalPendingFallbackRef.current) clearTimeout(modalPendingFallbackRef.current);
      modalPendingFallbackRef.current = null;
      return;
    }
    if (visibleIndex === currentIndex) {
      if (modalPendingFallbackRef.current) clearTimeout(modalPendingFallbackRef.current);
      modalPendingFallbackRef.current = null;
      return;
    }
    if (modalPendingFallbackRef.current) {
      clearTimeout(modalPendingFallbackRef.current);
    }
    modalPendingFallbackRef.current = setTimeout(() => {
      modalPendingFallbackRef.current = null;
      const fallbackIndex = currentIndexRef.current;
      visibleIndexRef.current = fallbackIndex;
      clearImageNavGuard(syncClickLockRef, syncUnlockTimeoutRef);
      setVisibleIndex(fallbackIndex);
    }, MODAL_PENDING_FALLBACK_MS);
  }, [isOpen, visibleIndex, currentIndex]);

  useEffect(
    () => () => {
      if (modalPendingFallbackRef.current) clearTimeout(modalPendingFallbackRef.current);
      modalPendingFallbackRef.current = null;
    },
    [],
  );

  const guardedNext = useCallback(() => {
    if (!isOpen) {
      onNext();
      return;
    }
    if (visibleIndexRef.current !== currentIndexRef.current) {
      return;
    }
    tryRunWithSyncImageNavLock({
      isActive: true,
      syncClickLockRef,
      syncUnlockTimeoutRef,
      run: () => onNext(),
    });
  }, [isOpen, onNext]);

  const guardedPrev = useCallback(() => {
    if (!isOpen) {
      onPrev();
      return;
    }
    if (visibleIndexRef.current !== currentIndexRef.current) {
      return;
    }
    tryRunWithSyncImageNavLock({
      isActive: true,
      syncClickLockRef,
      syncUnlockTimeoutRef,
      run: () => onPrev(),
    });
  }, [isOpen, onPrev]);

  onNextRef.current = guardedNext;
  onPrevRef.current = guardedPrev;

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setVisibleIndex(currentIndex);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, currentIndex]);

  return {
    visibleIndex,
    setVisibleIndex,
    swipeContainerRef,
    swipeHandledRef,
    swipeTimeoutRef,
    syncClickLockRef,
    syncUnlockTimeoutRef,
    visibleIndexRef,
    currentIndexRef,
    onNextRef,
    onPrevRef,
    isOpenRef,
    guardedNext,
    guardedPrev,
    getBlurDataURL,
  };
}
