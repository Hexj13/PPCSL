import { sessionStorageRemoveItem, sessionStorageSetItem } from '@/lib/browser-session-storage';
import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

export function preserveHomeScrollPosition(listingId?: string) {
  if (typeof window === 'undefined') return;
  const { restPath } = stripLocalePrefixFromPathname(window.location.pathname);
  if (restPath !== '/') return;
  sessionStorageSetItem('homeScrollPosition', String(window.scrollY));
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
