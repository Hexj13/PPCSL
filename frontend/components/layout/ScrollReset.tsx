'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';

import { sessionStorageGetItem, sessionStorageRemoveItem } from '@/lib/browser-session-storage';
import {
  beginHomeScrollRestore,
  ensureHomeReloadScrollPersistence,
  readHomeScrollRestoreTarget,
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

function setupHomeScrollRestoration(previousPath: string | null) {
  ensureHomeReloadScrollPersistence();

  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }

  const target = readHomeScrollRestoreTarget(previousPath);
  if (target) {
    beginHomeScrollRestore(target);
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

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const previousPath = previousPathRef.current;
    previousPathRef.current = pathname;

    const { restPath } = stripLocalePrefixFromPathname(pathname);

    if (scrollListingDetailToTopIfNeeded(restPath)) {
      return;
    }

    if (restPath === '/') {
      setupHomeScrollRestoration(previousPath);
      return;
    }

    if (shouldSkipScrollResetForPreservedScroll(previousPath, restPath)) {
      return;
    }

    const prevRest = previousPath ? stripLocalePrefixFromPathname(previousPath).restPath : null;

    if (SCROLL_TOP_ON_ENTER_PATHS.has(restPath) && prevRest !== restPath) {
      sessionStorageRemoveItem('scrollPreserved');
      scrollWindowToTopWithFollowUp();
      return;
    }

    if (previousPath && previousPath !== pathname) {
      scrollWindowToTopInstant();
    }
  }, [pathname]);

  return null;
}
