import { useRouter, useSegments } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { addSessionExpiredListener, clearAuthStorage, getSecure, TOKEN_KEY } from '@/api/client';
import { mobileAuthApi } from '@/api/auth';
import type { User } from '@/synced/api-types';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  setUser: (u: User | null) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const refreshUser = useCallback(async () => {
    const token = await getSecure(TOKEN_KEY);
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const { data } = await mobileAuthApi.me();
      setUser(data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      await refreshUser();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [refreshUser]);

  useEffect(() => {
    return addSessionExpiredListener(() => {
      setUser(null);
      const inAuth = segments[0] === 'auth';
      if (!inAuth) {
        router.replace('/auth/sign-in');
      }
    });
  }, [router, segments]);

  const signOut = useCallback(async () => {
    await clearAuthStorage();
    setUser(null);
    router.replace('/(tabs)');
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      loading,
      refreshUser,
      setUser,
      signOut,
    }),
    [user, loading, refreshUser, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth requires AuthProvider');
  return ctx;
}
