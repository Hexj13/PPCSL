'use client';

import { sessionStorageGetItem, sessionStorageRemoveItem } from '@/lib/browser-session-storage';
import { shouldRestoreHomeScrollAfterPath } from '@/lib/preserve-home-scroll';

const HOME_SCROLL_MAX_AGE_MS = 5 * 60 * 1000;
const RELOAD_SCROLL_MAX_AGE_MS = 10 * 60 * 1000;

export type HomeScrollRestoreSource = 'listing_return' | 'reload_or_back_forward';

type BodyStyleSnapshot = {
  position: string;
  top: string;
  width: string;
  left: string;
};

function snapshotBodyStyle(body: HTMLElement): BodyStyleSnapshot {
  return {
    position: body.style.position,
    top: body.style.top,
    width: body.style.width,
    left: body.style.left,
  };
}

function restoreBodyStyle(body: HTMLElement, snapshot: BodyStyleSnapshot): void {
  body.style.position = snapshot.position;
  body.style.top = snapshot.top;
  body.style.width = snapshot.width;
  body.style.left = snapshot.left;
}

export function readHomeScrollRestoreTarget(
  previousPath: string | null,
): { scrollY: number; source: HomeScrollRestoreSource } | null {
  try {
    const navEntry = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    const navType = navEntry?.type;
    const savedReloadY = sessionStorageGetItem('homeReloadScrollY');
    const reloadTs = sessionStorageGetItem('homeReloadScrollTs');

    if ((navType === 'reload' || navType === 'back_forward') && savedReloadY && reloadTs) {
      const savedTime = parseInt(reloadTs, 10);
      if (Date.now() - savedTime < RELOAD_SCROLL_MAX_AGE_MS) {
        const scrollY = parseInt(savedReloadY, 10);
        sessionStorageRemoveItem('homeReloadScrollY');
        sessionStorageRemoveItem('homeReloadScrollTs');
        if (Number.isFinite(scrollY) && scrollY > 0) {
          return { scrollY, source: 'reload_or_back_forward' };
        }
      } else {
        sessionStorageRemoveItem('homeReloadScrollY');
        sessionStorageRemoveItem('homeReloadScrollTs');
      }
    }
  } catch {
    // noop
  }

  const savedScroll = sessionStorageGetItem('homeScrollPosition');
  const timestamp = sessionStorageGetItem('homeScrollTimestamp');
  if (savedScroll && timestamp && shouldRestoreHomeScrollAfterPath(previousPath)) {
    const savedTime = parseInt(timestamp, 10);
    if (Date.now() - savedTime < HOME_SCROLL_MAX_AGE_MS) {
      const scrollY = parseInt(savedScroll, 10);
      sessionStorageRemoveItem('homeScrollPosition');
      if (Number.isFinite(scrollY) && scrollY > 0) {
        return { scrollY, source: 'listing_return' };
      }
    } else {
      sessionStorageRemoveItem('homeScrollPosition');
      sessionStorageRemoveItem('homeScrollTimestamp');
      sessionStorageRemoveItem('kupito_grid_state');
    }
  }

  return null;
}

export function applyHomeScrollRestore(scrollY: number): void {
  if (typeof window === 'undefined' || !Number.isFinite(scrollY) || scrollY <= 0) {
    return;
  }

  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }

  const body = document.body;
  const snapshot = snapshotBodyStyle(body);

  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.left = '0';
  body.style.width = '100%';

  restoreBodyStyle(body, snapshot);
  window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' });

  requestAnimationFrame(() => {
    if (Math.abs(window.scrollY - scrollY) > 2) {
      window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' });
    }
  });
}
