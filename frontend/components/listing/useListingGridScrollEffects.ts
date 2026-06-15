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
    prevIsLoadingRef.current = isLoading;
    prevShowContentRef.current = showContent;
    hasMountedRef.current = true;

    const shouldScroll = sessionStorageGetItem('scrollToResultsAfterLoad');
    if (!shouldScroll) return;

    const canAttemptSearchScroll =
      loadingJustFinished || isInitialEffect || contentJustBecameVisible;

    if (
      typeof window === 'undefined' ||
      !canAttemptSearchScroll ||
      isLoading ||
      !layoutReady ||
      listingsCount === 0 ||
      !showContent
    ) {
      return;
    }
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
