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
          localStorage.removeItem('returnUrl');
          sessionStorage.removeItem('kupito_search_filters');
          localStorage.removeItem('kupito_search_filters');
          useFavoritesStore.getState().clear();
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
