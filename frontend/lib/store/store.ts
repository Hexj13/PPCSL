import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { User } from '@/lib/api';
import { authApi } from '@/lib/api';

const MAX_COMPARE = 3;

function normalizeCompareIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const next: string[] = [];
  for (const id of ids) {
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
    if (next.length >= MAX_COMPARE) break;
  }
  return next;
}

function stripComparisonBackup() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('comparison-storage-backup');
  }
}

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
      skipHydration: true,
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
      skipHydration: true,
    },
  ),
);

interface ComparisonState {
  vehicleComparisons: string[];
  tireComparisons: string[];
  addVehicle: (_id: string) => boolean;
  removeVehicle: (_id: string) => void;
  checkVehicle: (_id: string) => boolean;
  setVehicleComparisons: (_ids: string[]) => void;
  addTire: (_id: string) => boolean;
  removeTire: (_id: string) => void;
  checkTire: (_id: string) => boolean;
  setTireComparisons: (_ids: string[]) => void;
  clearVehicles: () => void;
  clearTires: () => void;
  clear: () => void;
  count: () => number;
  rehydrate: () => Promise<void>;
}

type PersistedComparisonSlice = {
  vehicleComparisons?: string[];
  tireComparisons?: string[];
  comparisons?: string[];
};

function applyComparisonSnapshotFromStorage(slice: PersistedComparisonSlice | undefined) {
  if (!slice) return {};
  if (Array.isArray(slice.vehicleComparisons) || Array.isArray(slice.tireComparisons)) {
    return {
      vehicleComparisons: normalizeCompareIds(slice.vehicleComparisons ?? []),
      tireComparisons: normalizeCompareIds(slice.tireComparisons ?? []),
    };
  }
  if (Array.isArray(slice.comparisons)) {
    return {
      vehicleComparisons: normalizeCompareIds(slice.comparisons),
      tireComparisons: [],
    };
  }
  return {};
}

export const useComparisonStore = create<ComparisonState>()(
  persist(
    (set, get) => ({
      vehicleComparisons: [],
      tireComparisons: [],
      addVehicle: (_id) => {
        const current = get().vehicleComparisons;
        if (current.includes(_id)) return false;
        if (current.length >= MAX_COMPARE) return false;
        set({ vehicleComparisons: [...current, _id] });
        stripComparisonBackup();
        return true;
      },
      removeVehicle: (_id) => {
        set((state) => ({
          vehicleComparisons: state.vehicleComparisons.filter((c) => c !== _id),
        }));
        stripComparisonBackup();
      },
      checkVehicle: (_id) => get().vehicleComparisons.includes(_id),
      setVehicleComparisons: (_ids) => {
        set({ vehicleComparisons: normalizeCompareIds(_ids) });
        stripComparisonBackup();
      },
      addTire: (_id) => {
        const current = get().tireComparisons;
        if (current.includes(_id)) return false;
        if (current.length >= MAX_COMPARE) return false;
        set({ tireComparisons: [...current, _id] });
        stripComparisonBackup();
        return true;
      },
      removeTire: (_id) => {
        set((state) => ({
          tireComparisons: state.tireComparisons.filter((c) => c !== _id),
        }));
        stripComparisonBackup();
      },
      checkTire: (_id) => get().tireComparisons.includes(_id),
      setTireComparisons: (_ids) => {
        set({ tireComparisons: normalizeCompareIds(_ids) });
        stripComparisonBackup();
      },
      clearVehicles: () => {
        set({ vehicleComparisons: [] });
        stripComparisonBackup();
      },
      clearTires: () => {
        set({ tireComparisons: [] });
        stripComparisonBackup();
      },
      clear: () => {
        set({ vehicleComparisons: [], tireComparisons: [] });
        stripComparisonBackup();
      },
      count: () => get().vehicleComparisons.length + get().tireComparisons.length,
      rehydrate: async () => {
        if (typeof window === 'undefined') return;
        const stored = localStorage.getItem('comparison-storage');
        if (!stored) return;
        try {
          const parsed = JSON.parse(stored) as { state?: PersistedComparisonSlice };
          const next = applyComparisonSnapshotFromStorage(parsed.state);
          if (Object.keys(next).length > 0) {
            set(next as Pick<ComparisonState, 'vehicleComparisons' | 'tireComparisons'>);
          }
        } catch {
          // Ignore
        }
      },
    }),
    {
      name: 'comparison-storage',
      version: 1,
      storage: typeof window !== 'undefined' ? createJSONStorage(() => localStorage) : undefined,
      skipHydration: true,
      partialize: (state) => ({
        vehicleComparisons: state.vehicleComparisons,
        tireComparisons: state.tireComparisons,
      }),
      migrate: (persisted: unknown, fromVersion: number) => {
        const p = persisted as PersistedComparisonSlice | null | undefined;
        if (!p) {
          return { vehicleComparisons: [], tireComparisons: [] };
        }
        if (
          fromVersion === 0 &&
          Array.isArray(p.comparisons) &&
          !Array.isArray(p.vehicleComparisons)
        ) {
          return {
            vehicleComparisons: normalizeCompareIds(p.comparisons),
            tireComparisons: [],
          };
        }
        return {
          vehicleComparisons: normalizeCompareIds(p.vehicleComparisons ?? []),
          tireComparisons: normalizeCompareIds(p.tireComparisons ?? []),
        };
      },
    },
  ),
);
