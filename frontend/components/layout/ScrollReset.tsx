'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef, type MutableRefObject } from 'react';

import {
  sessionStorageGetItem,
  sessionStorageRemoveItem,
  sessionStorageSetItem,
} from '@/lib/browser-session-storage';
import { shouldRestoreHomeScrollAfterPath } from '@/lib/preserve-home-scroll';
import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

function scrollListingDetailToTopIfNeeded(restPath: string): boolean {
  if (restPath.startsWith('/listings/') && !restPath.includes('/edit')) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    return true;
  }
  return false;
}

function setupHomeScrollRestoration(
  previousPath: string | null,
  isRestoringRef: MutableRefObject<boolean>,
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

  try {
    const navEntry = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    const navType = navEntry?.type;

    const savedReloadY = sessionStorageGetItem('homeReloadScrollY');
    const reloadTs = sessionStorageGetItem('homeReloadScrollTs');

    if ((navType === 'reload' || navType === 'back_forward') && savedReloadY && reloadTs) {
      const savedTime = parseInt(reloadTs, 10);
      if (Date.now() - savedTime < 10 * 60 * 1000) {
        const scrollY = parseInt(savedReloadY, 10);
        sessionStorageRemoveItem('homeReloadScrollY');
        sessionStorageRemoveItem('homeReloadScrollTs');

        if (Number.isFinite(scrollY) && scrollY > 0) {
          isRestoringRef.current = true;
          setTimeout(() => {
            window.scrollTo({ top: scrollY, behavior: 'instant' });
            setTimeout(() => {
              window.scrollTo({ top: scrollY, behavior: 'instant' });
              isRestoringRef.current = false;
            }, 200);
          }, 0);
        }
      } else {
        sessionStorageRemoveItem('homeReloadScrollY');
        sessionStorageRemoveItem('homeReloadScrollTs');
      }
    }
  } catch {}

  const savedScroll = sessionStorageGetItem('homeScrollPosition');
  const timestamp = sessionStorageGetItem('homeScrollTimestamp');
  if (savedScroll && timestamp && shouldRestoreHomeScrollAfterPath(previousPath)) {
    const savedTime = parseInt(timestamp, 10);
    if (Date.now() - savedTime < 5 * 60 * 1000) {
      const scrollY = parseInt(savedScroll, 10);
      sessionStorageRemoveItem('homeScrollPosition');
      if (scrollY > 0) {
        isRestoringRef.current = true;
        setTimeout(() => {
          window.scrollTo({ top: scrollY, behavior: 'instant' });
          setTimeout(() => {
            window.scrollTo({ top: scrollY, behavior: 'instant' });
            isRestoringRef.current = false;
          }, 100);
        }, 0);
      }
    } else {
      sessionStorageRemoveItem('homeScrollPosition');
      sessionStorageRemoveItem('homeScrollTimestamp');
      sessionStorageRemoveItem('kupito_grid_state');
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
  const isRestoringRef = useRef(false);
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
      setupHomeScrollRestoration(previousPath, isRestoringRef, removeHomeListenersRef);
      return cleanup;
    }

    if (shouldSkipScrollResetForPreservedScroll(previousPath, restPath)) {
      return cleanup;
    }

    if (previousPath && previousPath !== pathname) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    return cleanup;
  }, [pathname]);

  return null;
}
