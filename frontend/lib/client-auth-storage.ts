import { localStorageRemoveItem } from '@/lib/browser-local-storage';

export const AUTH_STORAGE_PERSIST_KEY = 'auth-storage';

export function clearClientAuthLocalStorage(options?: {
  clearReturnUrl?: boolean;
  clearAuthPersistKey?: boolean;
  clearPendingMigrationAndFilters?: boolean;
}): void {
  if (typeof window === 'undefined') return;
  const {
    clearReturnUrl = true,
    clearAuthPersistKey = true,
    clearPendingMigrationAndFilters = true,
  } = options ?? {};
  localStorageRemoveItem('token');
  localStorageRemoveItem('refresh_token');
  if (clearAuthPersistKey) {
    localStorageRemoveItem(AUTH_STORAGE_PERSIST_KEY);
  }
  if (clearPendingMigrationAndFilters) {
    localStorageRemoveItem('pendingFavorites');
    localStorageRemoveItem('pendingComparisons');
    try {
      sessionStorage.removeItem('kupito_search_filters');
    } catch {
      void 0;
    }
    localStorageRemoveItem('kupito_search_filters');
  }
  if (clearReturnUrl) {
    localStorageRemoveItem('returnUrl');
  }
}
