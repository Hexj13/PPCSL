import { sessionStorageSetItem } from '@/lib/browser-session-storage';

export function preserveHomeScrollPosition(pathname: string) {
  if (pathname !== '/') return;
  sessionStorageSetItem('homeScrollPosition', String(window.scrollY));
  sessionStorageSetItem('homeScrollTimestamp', String(Date.now()));
}

export function shouldRestoreHomeScrollAfterPath(previousPath: string | null): boolean {
  if (!previousPath) return false;
  return previousPath.startsWith('/listings/') || previousPath.startsWith('/partners');
}
