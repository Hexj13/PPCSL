import { localStorageRemoveItem } from '@/lib/browser-local-storage';
import { sessionStorageRemoveItem } from '@/lib/browser-session-storage';

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
    sessionStorageRemoveItem('kupito_search_filters');
    localStorageRemoveItem('kupito_search_filters');
  }
  if (clearReturnUrl) {
    localStorageRemoveItem('returnUrl');
  }
  document.cookie = 'kupito-preferred-locale=; path=/; max-age=0; SameSite=Lax';
}
