'use client';

import React, { useEffect } from 'react';

import { useAuthStore } from '@/lib/store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  return <>{children}</>;
}
