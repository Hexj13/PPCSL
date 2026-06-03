'use client';

import { useEffect } from 'react';

import { sessionStorageGetItem, sessionStorageRemoveItem } from '@/lib/browser-session-storage';
import { restoreHomeScrollToListingCard } from '@/lib/home-scroll-restore';

type UseListingGridScrollEffectsArgs = {
  listingsCount: number;
  showContent: boolean;
};

export function useListingGridScrollEffects({
  listingsCount,
  showContent,
}: UseListingGridScrollEffectsArgs) {
  useEffect(() => {
    if (typeof window === 'undefined' || listingsCount === 0 || !showContent) return;
    const shouldScroll = sessionStorageGetItem('scrollToResultsAfterLoad');
    if (!shouldScroll) return;
    sessionStorageRemoveItem('scrollToResultsAfterLoad');
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
  }, [listingsCount, showContent]);

  useEffect(() => {
    if (!showContent || listingsCount === 0) {
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
    restoreHomeScrollToListingCard(listingId, scrollY);
  }, [showContent, listingsCount]);
}
