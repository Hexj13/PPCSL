'use client';

import React, { useEffect, useLayoutEffect } from 'react';

import { loadComparisonFromApi } from '@/lib/comparisonMigration';
import { useAuthStore, useComparisonStore, useFavoritesStore } from '@/lib/store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore((state) => state.initAuth);
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  useLayoutEffect(() => {
    void useAuthStore.persist?.rehydrate?.();
  }, []);

  useEffect(() => {
    const run = async () => {
      await Promise.all([
        useFavoritesStore.persist?.rehydrate?.() ?? Promise.resolve(),
        useComparisonStore.persist?.rehydrate?.() ?? Promise.resolve(),
      ]);
      await initAuth();
    };
    void run();
  }, [initAuth]);

  useEffect(() => {
    if (!isInitialized || !user) return;
    void loadComparisonFromApi();
  }, [isInitialized, user]);

  useEffect(() => {
    let syncTimer: ReturnType<typeof setTimeout> | null = null;
    let syncing = false;

    const syncAuthFromOtherTab = async () => {
      if (syncing) return;
      syncing = true;
      try {
        await useAuthStore.persist?.rehydrate?.();
        await initAuth();
      } finally {
        syncing = false;
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'auth-storage') {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(() => void syncAuthFromOtherTab(), 50);
        return;
      }
      if (e.key !== 'favorites-storage' && e.key !== 'comparison-storage') return;
      if (e.newValue === null) return;
      if (e.key === 'favorites-storage') {
        void useFavoritesStore.persist.rehydrate?.();
      }
      if (e.key === 'comparison-storage') {
        void useComparisonStore.persist.rehydrate?.();
      }
    };

    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      if (syncTimer) clearTimeout(syncTimer);
    };
  }, [initAuth]);

  return <>{children}</>;
}
