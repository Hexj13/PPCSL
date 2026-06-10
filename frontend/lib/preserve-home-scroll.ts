import {
  sessionStorageGetItem,
  sessionStorageRemoveItem,
  sessionStorageSetItem,
} from '@/lib/browser-session-storage';
import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

const RELOAD_SCROLL_MAX_AGE_MS = 10 * 60 * 1000;

function readRecentHomeReloadScrollY(): number | null {
  const savedReloadY = sessionStorageGetItem('homeReloadScrollY');
  const reloadTs = sessionStorageGetItem('homeReloadScrollTs');
  if (!savedReloadY || !reloadTs) {
    return null;
  }
  const savedTime = parseInt(reloadTs, 10);
  if (!Number.isFinite(savedTime) || Date.now() - savedTime > RELOAD_SCROLL_MAX_AGE_MS) {
    return null;
  }
  const scrollY = parseInt(savedReloadY, 10);
  return Number.isFinite(scrollY) && scrollY > 0 ? scrollY : null;
}

export function preserveHomeScrollPosition(listingId?: string) {
  if (typeof window === 'undefined') return;
  const { restPath } = stripLocalePrefixFromPathname(window.location.pathname);
  if (restPath !== '/') return;
  const reloadScrollY = readRecentHomeReloadScrollY();
  const scrollY = reloadScrollY ?? window.scrollY;
  sessionStorageSetItem('homeScrollPosition', String(scrollY));
  sessionStorageSetItem('homeScrollTimestamp', String(Date.now()));
  if (listingId) {
    sessionStorageSetItem('homeScrollListingId', listingId);
  } else {
    sessionStorageRemoveItem('homeScrollListingId');
  }
}

export function shouldRestoreHomeScrollAfterPath(previousPath: string | null): boolean {
  if (!previousPath) return false;
  const { restPath } = stripLocalePrefixFromPathname(previousPath);
  return restPath.startsWith('/listings/') || restPath.startsWith('/partners');
}
