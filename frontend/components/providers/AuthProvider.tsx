'use client';

import React, { useEffect } from 'react';

import { useAuthStore, useComparisonStore, useFavoritesStore } from '@/lib/store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    const run = async () => {
      await Promise.all([
        useAuthStore.persist?.rehydrate?.() ?? Promise.resolve(),
        useFavoritesStore.persist?.rehydrate?.() ?? Promise.resolve(),
        useComparisonStore.persist?.rehydrate?.() ?? Promise.resolve(),
      ]);
      await initAuth();
    };
    void run();
  }, [initAuth]);

  return <>{children}</>;
}
