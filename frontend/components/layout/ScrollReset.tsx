'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef, type MutableRefObject } from 'react';

import {
  sessionStorageGetItem,
  sessionStorageRemoveItem,
  sessionStorageSetItem,
} from '@/lib/browser-session-storage';
import {
  applyHomeScrollRestore,
  readHomeScrollRestoreTarget,
  restoreHomeScrollToListingCard,
} from '@/lib/home-scroll-restore';
import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

const SCROLL_TOP_ON_ENTER_PATHS = new Set(['/favorites', '/compare']);

function scrollWindowToTopInstant() {
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function scrollWindowToTopWithFollowUp() {
  scrollWindowToTopInstant();
  requestAnimationFrame(scrollWindowToTopInstant);
}

function scrollListingDetailToTopIfNeeded(restPath: string): boolean {
  if (restPath.startsWith('/listings/') && !restPath.includes('/edit')) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    return true;
  }
  return false;
}

function setupHomeScrollRestoration(
  previousPath: string | null,
  removeHomeListenersRef: MutableRefObject<(() => void) | null>,
) {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }

  const saveReloadScroll = () => {
    sessionStorageSetItem('homeReloadScrollY', String(window.scrollY));
    sessionStorageSetItem('homeReloadScrollTs', String(Date.now()));
  };

  window.addEventListener('pagehide', saveReloadScroll);
  removeHomeListenersRef.current = () => {
    window.removeEventListener('pagehide', saveReloadScroll);
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'auto';
    }
  };

  const target = readHomeScrollRestoreTarget(previousPath);
  if (target) {
    if (target.source === 'listing_return' && target.listingId) {
      restoreHomeScrollToListingCard(target.listingId, target.scrollY);
    } else {
      applyHomeScrollRestore(target.scrollY);
    }
  }
}

function shouldSkipScrollResetForPreservedScroll(
  previousPath: string | null,
  restPath: string,
): boolean {
  if (sessionStorageGetItem('scrollPreserved') !== 'true') {
    return false;
  }
  const prevRest = previousPath ? stripLocalePrefixFromPathname(previousPath).restPath : null;
  const sameRestPath = prevRest !== null && prevRest === restPath;
  if (sameRestPath) {
    return true;
  }
  sessionStorageRemoveItem('scrollPreserved');
  return false;
}

export function ScrollReset() {
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);
  const removeHomeListenersRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const previousPath = previousPathRef.current;
    previousPathRef.current = pathname;

    const cleanup = () => {
      removeHomeListenersRef.current?.();
      removeHomeListenersRef.current = null;
    };

    cleanup();

    const { restPath } = stripLocalePrefixFromPathname(pathname);

    if (scrollListingDetailToTopIfNeeded(restPath)) {
      return cleanup;
    }

    if (restPath === '/') {
      setupHomeScrollRestoration(previousPath, removeHomeListenersRef);
      return cleanup;
    }

    if (shouldSkipScrollResetForPreservedScroll(previousPath, restPath)) {
      return cleanup;
    }

    const prevRest = previousPath ? stripLocalePrefixFromPathname(previousPath).restPath : null;

    if (SCROLL_TOP_ON_ENTER_PATHS.has(restPath) && prevRest !== restPath) {
      sessionStorageRemoveItem('scrollPreserved');
      scrollWindowToTopWithFollowUp();
      return cleanup;
    }

    if (previousPath && previousPath !== pathname) {
      scrollWindowToTopInstant();
    }

    return cleanup;
  }, [pathname]);

  return null;
}
