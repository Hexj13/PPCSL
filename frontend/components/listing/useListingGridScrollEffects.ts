'use client';

import { useEffect, useRef } from 'react';

import { sessionStorageGetItem, sessionStorageRemoveItem } from '@/lib/browser-session-storage';
import {
  applyHomeScrollRestoreWhenGridReady,
  getHomeScrollRestorePhase,
  reportBannerDecided,
  reportGridReady,
  subscribeHomeScrollRestoreState,
} from '@/lib/home-scroll-restore';
import { DESKTOP_LAYOUT_MIN_WIDTH_PX } from '@/lib/layout-breakpoints';

type UseListingGridScrollEffectsArgs = {
  listingsCount: number;
  showContent: boolean;
  isLoading: boolean;
  searchParamsString: string;
  layoutReady: boolean;
};

export function useListingGridScrollEffects({
  listingsCount,
  showContent,
  isLoading,
  searchParamsString,
  layoutReady,
}: UseListingGridScrollEffectsArgs) {
  const prevIsLoadingRef = useRef(isLoading);
  const prevShowContentRef = useRef(showContent);
  const prevLayoutReadyRef = useRef(layoutReady);
  const hasMountedRef = useRef(false);
  const homeScrollRestoreAttemptedRef = useRef(false);
  const searchScrollHandledRef = useRef(false);
  const showContentRef = useRef(showContent);
  const layoutReadyRef = useRef(layoutReady);
  const listingsCountRef = useRef(listingsCount);

  showContentRef.current = showContent;
  layoutReadyRef.current = layoutReady;
  listingsCountRef.current = listingsCount;

  useEffect(() => {
    homeScrollRestoreAttemptedRef.current = false;
    searchScrollHandledRef.current = false;
  }, [searchParamsString]);

  useEffect(() => {
    const loadingJustFinished = prevIsLoadingRef.current && !isLoading;
    const isInitialEffect = !hasMountedRef.current;
    const contentJustBecameVisible = !prevShowContentRef.current && showContent;
    const layoutJustBecameReady = !prevLayoutReadyRef.current && layoutReady;
    prevIsLoadingRef.current = isLoading;
    prevShowContentRef.current = showContent;
    prevLayoutReadyRef.current = layoutReady;
    hasMountedRef.current = true;

    const shouldScroll = sessionStorageGetItem('scrollToResultsAfterLoad');
    if (!shouldScroll) return;

    const canAttemptSearchScroll =
      loadingJustFinished || isInitialEffect || contentJustBecameVisible || layoutJustBecameReady;

    if (
      typeof window === 'undefined' ||
      !canAttemptSearchScroll ||
      isLoading ||
      !layoutReady ||
      !showContent
    ) {
      return;
    }

    const forceFromHeader = shouldScroll === 'header';
    if (listingsCount === 0) {
      if (!forceFromHeader) {
        return;
      }
      sessionStorageRemoveItem('scrollToResultsAfterLoad');
      searchScrollHandledRef.current = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    sessionStorageRemoveItem('scrollToResultsAfterLoad');
    searchScrollHandledRef.current = true;
    if (
      !forceFromHeader &&
      window.innerWidth >= DESKTOP_LAYOUT_MIN_WIDTH_PX &&
      window.scrollY > 32
    ) {
      return;
    }
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
  }, [isLoading, layoutReady, listingsCount, showContent]);

  useEffect(() => {
    const tryReportHomeScrollGridReady = () => {
      if (
        homeScrollRestoreAttemptedRef.current ||
        searchScrollHandledRef.current ||
        !showContentRef.current ||
        !layoutReadyRef.current ||
        listingsCountRef.current === 0 ||
        sessionStorageGetItem('scrollToResultsAfterLoad')
      ) {
        return;
      }

      const restorePhase = getHomeScrollRestorePhase();
      if (restorePhase === 'pending') {
        applyHomeScrollRestoreWhenGridReady();
      }

      const phaseAfterApply = getHomeScrollRestorePhase();
      if (phaseAfterApply !== 'scrolled' && phaseAfterApply !== 'correcting') {
        return;
      }

      homeScrollRestoreAttemptedRef.current = true;
      reportGridReady(listingsCountRef.current);
      reportBannerDecided();
    };

    tryReportHomeScrollGridReady();

    return subscribeHomeScrollRestoreState((restorePhase) => {
      if (
        restorePhase === 'pending' ||
        restorePhase === 'scrolled' ||
        restorePhase === 'correcting'
      ) {
        tryReportHomeScrollGridReady();
      }
    });
  }, [showContent, layoutReady, listingsCount]);
}
