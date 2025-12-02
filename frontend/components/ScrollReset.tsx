'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function ScrollReset() {
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);
  const isRestoringRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const previousPath = previousPathRef.current;
    previousPathRef.current = pathname;

    if (pathname.startsWith('/listings/') && !pathname.includes('/edit')) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    if (pathname === '/') {
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
      return;
    }

    const scrollPreserved = sessionStorage.getItem('scrollPreserved');
    if (scrollPreserved === 'true') {
      return;
    }

    if (previousPath && previousPath !== pathname) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [pathname]);

  return null;
}
