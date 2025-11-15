import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { authApi, User } from './api';

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
        const { token, refreshToken } = get();

        if (token && typeof window !== 'undefined') {
          try {
            const response = await authApi.me();
            const storedRefreshToken = localStorage.getItem('refresh_token');
            set({
              user: response.data,
              token,
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
                if (typeof window !== 'undefined') {
                  localStorage.setItem('token', refreshResponse.data.access_token);
                  localStorage.setItem('refresh_token', refreshResponse.data.refresh_token);
                }
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
    }
  )
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
    }
  )
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
        console.log('[STORE] add() called with id:', _id, 'current comparisons:', current);
        if (current.includes(_id)) {
          console.log('[STORE] ID already in comparisons, returning false');
          return false;
        }
        if (current.length >= 3) {
          console.log('[STORE] Max comparisons reached, returning false');
          return false;
        }
        const newComparisons = [...current, _id];
        console.log('[STORE] Setting new comparisons:', newComparisons);
        set({ comparisons: newComparisons });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('comparison-storage-backup');
          const stored = localStorage.getItem('comparison-storage');
          console.log('[STORE] localStorage after set:', stored);
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
        console.log('[STORE] rehydrate() called');
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('comparison-storage');
          console.log('[STORE] rehydrate() localStorage value:', stored);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              console.log('[STORE] rehydrate() parsed:', parsed);
              if (parsed.state?.comparisons) {
                console.log('[STORE] rehydrate() setting comparisons:', parsed.state.comparisons);
                set({ comparisons: parsed.state.comparisons });
                console.log('[STORE] rehydrate() after set, current state:', get().comparisons);
              } else {
                console.log('[STORE] rehydrate() no comparisons in parsed state');
              }
            } catch (error) {
              console.error('[STORE] rehydrate() error parsing:', error);
            }
          } else {
            console.log('[STORE] rehydrate() no stored value in localStorage');
          }
        } else {
          console.log('[STORE] rehydrate() window undefined');
        }
      },
    }),
    {
      name: 'comparison-storage',
      storage: typeof window !== 'undefined' ? createJSONStorage(() => localStorage) : undefined,
    }
  )
);
