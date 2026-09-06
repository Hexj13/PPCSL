'use client';

import { useSyncExternalStore } from 'react';

import { localStorageGetItem, localStorageSetItem } from '@/lib/browser-local-storage';

export const LISTING_VIEW_MODE_STORAGE_KEY = 'ppcsl_listing_view_mode';

export type ListingViewMode = 'large' | 'compact';

const DEFAULT_VIEW_MODE: ListingViewMode = 'large';

const listeners = new Set<() => void>();
let storageListening = false;

function isListingViewMode(value: string | null): value is ListingViewMode {
  return value === 'large' || value === 'compact';
}

function notifyListingViewModeListeners(): void {
  listeners.forEach((listener) => listener());
}

function onStorage(event: StorageEvent): void {
  if (event.key === LISTING_VIEW_MODE_STORAGE_KEY || event.key === null) {
    notifyListingViewModeListeners();
  }
}

function ensureStorageListener(): void {
  if (typeof window === 'undefined' || storageListening) {
    return;
  }
  window.addEventListener('storage', onStorage);
  storageListening = true;
}

export function readListingViewMode(): ListingViewMode {
  const stored = localStorageGetItem(LISTING_VIEW_MODE_STORAGE_KEY);
  return isListingViewMode(stored) ? stored : DEFAULT_VIEW_MODE;
}

export function setListingViewMode(mode: ListingViewMode): void {
  localStorageSetItem(LISTING_VIEW_MODE_STORAGE_KEY, mode);
  notifyListingViewModeListeners();
}

export function subscribeListingViewMode(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  ensureStorageListener();
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function useListingViewMode(): ListingViewMode {
  return useSyncExternalStore(
    subscribeListingViewMode,
    readListingViewMode,
    () => DEFAULT_VIEW_MODE,
  );
}
