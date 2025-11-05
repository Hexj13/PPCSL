import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { authApi, User } from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  isInitialized: boolean;
  setAuth: (_user: User | null, _token: string | null) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isInitialized: false,
      setAuth: (_user, _token) => {
        set({ user: _user, token: _token, isInitialized: true });
        if (_token && typeof window !== 'undefined') {
          localStorage.setItem('token', _token);
        }
      },
      logout: () => {
        set({ user: null, token: null, isInitialized: true });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('pendingFavorites');
          localStorage.removeItem('returnUrl');
          useFavoritesStore.getState().clear();
        }
      },
      initAuth: async () => {
        const { token } = get();

        if (token && typeof window !== 'undefined') {
          try {
            const response = await authApi.me();
            set({ user: response.data, token, isInitialized: true });
          } catch {
            get().logout();
            set({ isInitialized: true });
          }
        } else {
          set({ isInitialized: true });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: typeof window !== 'undefined' ? createJSONStorage(() => localStorage) : undefined,
      partialize: (state) => ({ user: state.user, token: state.token }),
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
