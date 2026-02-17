import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { User } from '@/lib/api';
import { authApi } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isInitialized: boolean;
  setAuth: (_user: User | null, _token: string | null, _refreshToken?: string | null) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isInitialized: false,
      setAuth: (_user, _token, _refreshToken = null) => {
        set({ user: _user, token: _token, refreshToken: _refreshToken, isInitialized: true });
        if (typeof window !== 'undefined') {
          if (_token) {
            localStorage.setItem('token', _token);
          }
          if (_refreshToken) {
            localStorage.setItem('refresh_token', _refreshToken);
          }
        }
      },
      logout: () => {
        set({ user: null, token: null, refreshToken: null, isInitialized: true });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('pendingFavorites');
          localStorage.removeItem('pendingComparisons');
          localStorage.removeItem('returnUrl');
          sessionStorage.removeItem('kupito_search_filters');
          localStorage.removeItem('kupito_search_filters');
          useFavoritesStore.getState().clear();
          useComparisonStore.getState().clear();
        }
      },
      initAuth: async () => {
        if (typeof window === 'undefined') {
          set({ isInitialized: true });
          return;
        }

        const { token, refreshToken } = get();
        const storedToken = localStorage.getItem('token');
        const actualToken = token || storedToken;

        if (actualToken) {
          try {
            const response = await authApi.me();
            const storedRefreshToken = localStorage.getItem('refresh_token');
            set({
              user: response.data,
              token: actualToken,
              refreshToken: refreshToken || storedRefreshToken,
              isInitialized: true,
            });
          } catch {
            const storedRefreshToken = localStorage.getItem('refresh_token');
            if (storedRefreshToken) {
              try {
                const refreshResponse = await authApi.refresh({
                  refresh_token: storedRefreshToken,
                });
                set({
                  user: refreshResponse.data.user,
                  token: refreshResponse.data.access_token,
                  refreshToken: refreshResponse.data.refresh_token,
                  isInitialized: true,
                });
                localStorage.setItem('token', refreshResponse.data.access_token);
                localStorage.setItem('refresh_token', refreshResponse.data.refresh_token);
              } catch {
                get().logout();
                set({ isInitialized: true });
              }
            } else {
              get().logout();
              set({ isInitialized: true });
            }
          }
        } else {
          set({ isInitialized: true });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: typeof window !== 'undefined' ? createJSONStorage(() => localStorage) : undefined,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);

interface FavoritesState {
  favorites: string[];
  add: (_id: string) => void;
  remove: (_id: string) => void;
  check: (_id: string) => boolean;
  setFavorites: (_ids: string[]) => void;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      add: (_id) => set((state) => ({ favorites: [...state.favorites, _id] })),
      remove: (_id) => set((state) => ({ favorites: state.favorites.filter((f) => f !== _id) })),
      check: (_id) => get().favorites.includes(_id),
      setFavorites: (_ids) => set({ favorites: _ids }),
      clear: () => set({ favorites: [] }),
    }),
    {
      name: 'favorites-storage',
      storage: typeof window !== 'undefined' ? createJSONStorage(() => localStorage) : undefined,
    },
  ),
);

interface ComparisonState {
  comparisons: string[];
  add: (_id: string) => boolean;
  remove: (_id: string) => void;
  check: (_id: string) => boolean;
  clear: () => void;
  count: () => number;
  rehydrate: () => Promise<void>;
}

export const useComparisonStore = create<ComparisonState>()(
  persist(
    (set, get) => ({
      comparisons: [],
      add: (_id) => {
        const current = get().comparisons;
        if (current.includes(_id)) {
          return false;
        }
        if (current.length >= 3) {
          return false;
        }
        set({ comparisons: [...current, _id] });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('comparison-storage-backup');
        }
        return true;
      },
      remove: (_id) => {
        set((state) => ({ comparisons: state.comparisons.filter((c) => c !== _id) }));
        if (typeof window !== 'undefined') {
          localStorage.removeItem('comparison-storage-backup');
        }
      },
      check: (_id) => get().comparisons.includes(_id),
      clear: () => {
        set({ comparisons: [] });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('comparison-storage-backup');
        }
      },
      count: () => get().comparisons.length,
      rehydrate: async () => {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('comparison-storage');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed.state?.comparisons) {
                set({ comparisons: parsed.state.comparisons });
              }
            } catch {
              // Ignore errors
            }
          }
        }
      },
    }),
    {
      name: 'comparison-storage',
      storage: typeof window !== 'undefined' ? createJSONStorage(() => localStorage) : undefined,
    },
  ),
);
