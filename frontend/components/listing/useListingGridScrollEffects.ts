'use client';

import { useEffect, useRef } from 'react';

import { sessionStorageGetItem, sessionStorageRemoveItem } from '@/lib/browser-session-storage';
import { restoreHomeScrollToListingCard } from '@/lib/home-scroll-restore';

type UseListingGridScrollEffectsArgs = {
  listingsCount: number;
  showContent: boolean;
  isLoading: boolean;
  searchParamsString: string;
};

export function useListingGridScrollEffects({
  listingsCount,
  showContent,
  isLoading,
  searchParamsString,
}: UseListingGridScrollEffectsArgs) {
  const prevIsLoadingRef = useRef(isLoading);
  const hasMountedRef = useRef(false);
  const homeScrollRestoreAttemptedRef = useRef(false);
  const searchScrollHandledRef = useRef(false);

  useEffect(() => {
    homeScrollRestoreAttemptedRef.current = false;
    searchScrollHandledRef.current = false;
  }, [searchParamsString]);

  useEffect(() => {
    const loadingJustFinished = prevIsLoadingRef.current && !isLoading;
    const isInitialEffect = !hasMountedRef.current;
    prevIsLoadingRef.current = isLoading;
    hasMountedRef.current = true;

    if (
      typeof window === 'undefined' ||
      (!loadingJustFinished && !isInitialEffect) ||
      isLoading ||
      listingsCount === 0 ||
      !showContent
    ) {
      return;
    }
    const shouldScroll = sessionStorageGetItem('scrollToResultsAfterLoad');
    if (!shouldScroll) return;
    sessionStorageRemoveItem('scrollToResultsAfterLoad');
    searchScrollHandledRef.current = true;
    requestAnimationFrame(() => {
      const el = document.getElementById('listings-results');
      if (!el) return;
      const headerEl = document.querySelector('header');
      const measuredHeaderHeight = headerEl?.getBoundingClientRect().height ?? 0;
      const fallbackHeaderHeight = window.innerWidth >= 1024 ? 72 : 110;
      const headerOffset = (measuredHeaderHeight || fallbackHeaderHeight) + 60;
      const targetTop = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    });
  }, [isLoading, listingsCount, showContent]);

  useEffect(() => {
    if (
      !showContent ||
      listingsCount === 0 ||
      homeScrollRestoreAttemptedRef.current ||
      searchScrollHandledRef.current
    ) {
      return;
    }
    if (sessionStorageGetItem('scrollToResultsAfterLoad')) {
      return;
    }
    const listingId = sessionStorageGetItem('homeScrollListingId');
    const scrollYRaw = sessionStorageGetItem('homeScrollPosition');
    if (!listingId || !scrollYRaw) {
      return;
    }
    const scrollY = parseInt(scrollYRaw, 10);
    if (!Number.isFinite(scrollY) || scrollY <= 0) {
      return;
    }
    homeScrollRestoreAttemptedRef.current = true;
    restoreHomeScrollToListingCard(listingId, scrollY);
  }, [showContent, listingsCount]);
}
