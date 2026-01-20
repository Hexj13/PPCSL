'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function ScrollReset() {
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);
  const isRestoringRef = useRef(false);
  const removeHomeListenersRef = useRef<(() => void) | null>(null);

  useEffect(() => {
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
        try {
          sessionStorage.setItem('homeReloadScrollY', String(window.scrollY));
          sessionStorage.setItem('homeReloadScrollTs', String(Date.now()));
        } catch {}
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

        const savedScroll = sessionStorage.getItem('homeReloadScrollY');
        const timestamp = sessionStorage.getItem('homeReloadScrollTs');

        if ((navType === 'reload' || navType === 'back_forward') && savedScroll && timestamp) {
          const savedTime = parseInt(timestamp, 10);
          if (Date.now() - savedTime < 10 * 60 * 1000) {
            const scrollY = parseInt(savedScroll, 10);
            sessionStorage.removeItem('homeReloadScrollY');
            sessionStorage.removeItem('homeReloadScrollTs');

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
            sessionStorage.removeItem('homeReloadScrollY');
            sessionStorage.removeItem('homeReloadScrollTs');
          }
        }
      } catch {
        // ignore
      }

      const savedScroll = sessionStorage.getItem('homeScrollPosition');
      const timestamp = sessionStorage.getItem('homeScrollTimestamp');
      if (savedScroll && timestamp && previousPath?.startsWith('/listings/')) {
        const savedTime = parseInt(timestamp, 10);
        if (Date.now() - savedTime < 5 * 60 * 1000) {
          const scrollY = parseInt(savedScroll, 10);
          sessionStorage.removeItem('homeScrollPosition');
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
          sessionStorage.removeItem('homeScrollPosition');
          sessionStorage.removeItem('homeScrollTimestamp');
          sessionStorage.removeItem('kupito_grid_state');
        }
      }

      return cleanup;
    }

    const scrollPreserved = sessionStorage.getItem('scrollPreserved');
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
