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

  return <>{children}</>;
}
