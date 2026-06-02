'use client';

import { sessionStorageGetItem, sessionStorageRemoveItem } from '@/lib/browser-session-storage';
import { shouldRestoreHomeScrollAfterPath } from '@/lib/preserve-home-scroll';

const HOME_SCROLL_MAX_AGE_MS = 5 * 60 * 1000;
const RELOAD_SCROLL_MAX_AGE_MS = 10 * 60 * 1000;
const ANCHOR_RESTORE_MAX_DURATION_MS = 1500;
const ANCHOR_RESTORE_GAP_PX = 8;
const DEFAULT_STICKY_HEADER_HEIGHT_PX = 72;

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
): { scrollY: number; source: HomeScrollRestoreSource; listingId?: string } | null {
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
      const savedListingId = sessionStorageGetItem('homeScrollListingId');
      sessionStorageRemoveItem('homeScrollPosition');
      sessionStorageRemoveItem('homeScrollListingId');
      if (Number.isFinite(scrollY) && scrollY > 0) {
        return { scrollY, source: 'listing_return', listingId: savedListingId ?? undefined };
      }
    } else {
      sessionStorageRemoveItem('homeScrollPosition');
      sessionStorageRemoveItem('homeScrollTimestamp');
      sessionStorageRemoveItem('homeScrollListingId');
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

  window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' });

  requestAnimationFrame(() => {
    restoreBodyStyle(body, snapshot);
    if (Math.abs(window.scrollY - scrollY) > 2) {
      window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' });
    }
  });
}

function getStickyHeaderOffset(): number {
  const header = document.querySelector('header');
  const height = header?.getBoundingClientRect().height ?? 0;
  return (height || DEFAULT_STICKY_HEADER_HEIGHT_PX) + ANCHOR_RESTORE_GAP_PX;
}

function buildListingCardSelector(listingId: string): string {
  const escapedId =
    typeof window.CSS !== 'undefined' && typeof window.CSS.escape === 'function'
      ? window.CSS.escape(listingId)
      : listingId;
  return `[data-testid="listing-card-${escapedId}"]`;
}

export function restoreHomeScrollToListingCard(listingId: string, fallbackScrollY: number): void {
  if (typeof window === 'undefined') {
    return;
  }

  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }

  if (Number.isFinite(fallbackScrollY) && fallbackScrollY > 0) {
    window.scrollTo({ top: fallbackScrollY, left: 0, behavior: 'instant' });
  }

  const selector = buildListingCardSelector(listingId);
  const now = () =>
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  const start = now();
  let cancelled = false;

  const handleUserInteraction = () => {
    cancelled = true;
  };
  const listenerOptions: AddEventListenerOptions = { passive: true };
  window.addEventListener('wheel', handleUserInteraction, listenerOptions);
  window.addEventListener('touchmove', handleUserInteraction, listenerOptions);
  window.addEventListener('keydown', handleUserInteraction);

  const cleanup = () => {
    window.removeEventListener('wheel', handleUserInteraction, listenerOptions);
    window.removeEventListener('touchmove', handleUserInteraction, listenerOptions);
    window.removeEventListener('keydown', handleUserInteraction);
  };

  const step = () => {
    if (cancelled) {
      cleanup();
      return;
    }

    const card = document.querySelector(selector);
    if (card) {
      const headerOffset = getStickyHeaderOffset();
      const rect = card.getBoundingClientRect();
      const desired = Math.max(0, Math.round(rect.top + window.scrollY - headerOffset));
      if (Math.abs(window.scrollY - desired) > 1) {
        window.scrollTo({ top: desired, left: 0, behavior: 'instant' });
      }
    }

    if (now() - start < ANCHOR_RESTORE_MAX_DURATION_MS) {
      requestAnimationFrame(step);
    } else {
      cleanup();
    }
  };

  requestAnimationFrame(step);
}
