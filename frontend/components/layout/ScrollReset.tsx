'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';

import {
  sessionStorageGetItem,
  sessionStorageRemoveItem,
  sessionStorageSetItem,
} from '@/lib/browser-session-storage';
import { shouldRestoreHomeScrollAfterPath } from '@/lib/preserve-home-scroll';

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

    if (pathname.startsWith('/listings/') && !pathname.includes('/edit')) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return cleanup;
    }

    if (pathname === '/') {
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

        const savedScroll = sessionStorageGetItem('homeReloadScrollY');
        const timestamp = sessionStorageGetItem('homeReloadScrollTs');

        if ((navType === 'reload' || navType === 'back_forward') && savedScroll && timestamp) {
          const savedTime = parseInt(timestamp, 10);
          if (Date.now() - savedTime < 10 * 60 * 1000) {
            const scrollY = parseInt(savedScroll, 10);
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
      } catch {
        // ignore
      }

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

      return cleanup;
    }

    const scrollPreserved = sessionStorageGetItem('scrollPreserved');
    if (scrollPreserved === 'true') {
      return cleanup;
    }

    if (previousPath && previousPath !== pathname) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    return cleanup;
  }, [pathname]);

  return null;
}
