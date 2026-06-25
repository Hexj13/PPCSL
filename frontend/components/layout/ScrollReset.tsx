'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';

import {
  sessionStorageGetItem,
  sessionStorageRemoveItem,
  sessionStorageSetItem,
} from '@/lib/browser-session-storage';
import {
  beginHomeScrollRestore,
  clearHomeScrollRestoreSession,
  ensureHomeScrollRestoreInteractionListeners,
  readHomeScrollRestoreTarget,
} from '@/lib/home-scroll-restore';
import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

const SCROLL_TOP_ON_ENTER_PATHS = new Set(['/favorites', '/compare']);
const LAST_REST_PATH_KEY = 'homeScrollLastRestPath';

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
  ensureHomeScrollRestoreInteractionListeners();

  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }

  const target = readHomeScrollRestoreTarget(previousPath);
  if (target) {
    beginHomeScrollRestore(target);
    return;
  }

  clearHomeScrollRestoreSession();
  sessionStorageRemoveItem('kupito_grid_state');
  sessionStorageRemoveItem('kupito_grid_restore_state');
  scrollWindowToTopWithFollowUp();
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
    const rememberCurrentPath = () => {
      sessionStorageSetItem(LAST_REST_PATH_KEY, restPath);
    };

    if (scrollListingDetailToTopIfNeeded(restPath)) {
      rememberCurrentPath();
      return;
    }

    if (restPath === '/') {
      setupHomeScrollRestoration(previousPath);
      rememberCurrentPath();
      return;
    }

    if (shouldSkipScrollResetForPreservedScroll(previousPath, restPath)) {
      rememberCurrentPath();
      return;
    }

    const prevRest = previousPath ? stripLocalePrefixFromPathname(previousPath).restPath : null;

    if (SCROLL_TOP_ON_ENTER_PATHS.has(restPath) && prevRest !== restPath) {
      sessionStorageRemoveItem('scrollPreserved');
      scrollWindowToTopWithFollowUp();
      rememberCurrentPath();
      return;
    }

    if (previousPath && previousPath !== pathname) {
      scrollWindowToTopInstant();
    }
    rememberCurrentPath();
  }, [pathname]);

  return null;
}
