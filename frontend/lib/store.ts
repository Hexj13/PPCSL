import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { authApi, User } from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  isInitialized: boolean;
  setAuth: (user: User | null, token: string | null) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isInitialized: false,
      setAuth: (user, token) => {
        set({ user, token, isInitialized: true });
        if (token && typeof window !== 'undefined') {
          localStorage.setItem('token', token);
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
          } catch (error) {
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
  add: (id: string) => void;
  remove: (id: string) => void;
  check: (id: string) => boolean;
  setFavorites: (ids: string[]) => void;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      add: (id) => set((state) => ({ favorites: [...state.favorites, id] })),
      remove: (id) => set((state) => ({ favorites: state.favorites.filter((f) => f !== id) })),
      check: (id) => get().favorites.includes(id),
      setFavorites: (ids) => set({ favorites: ids }),
      clear: () => set({ favorites: [] }),
    }),
    {
      name: 'favorites-storage',
      storage: typeof window !== 'undefined' ? createJSONStorage(() => localStorage) : undefined,
    }
  )
);
