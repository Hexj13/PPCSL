import { createJSONStorage, type StateStorage } from 'zustand/middleware';

const noopPersistStateStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

let localStorageUsable: boolean | null = null;

function probeLocalStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const k = '__ls_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function isLocalStorageUsable(): boolean {
  if (typeof window === 'undefined') return false;
  if (localStorageUsable === null) {
    localStorageUsable = probeLocalStorage();
  }
  return localStorageUsable;
}

function createMemoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => {
      m.clear();
    },
    getItem: (key: string) => m.get(key) ?? null,
    key: (index: number) => Array.from(m.keys())[index] ?? null,
    removeItem: (key: string) => {
      m.delete(key);
    },
    setItem: (key: string, value: string) => {
      m.set(key, value);
    },
  } as Storage;
}

export function getLocalStorageOrMemory(): Storage {
  if (typeof window === 'undefined') {
    return createMemoryStorage();
  }
  if (isLocalStorageUsable()) {
    return window.localStorage;
  }
  return createMemoryStorage();
}

export function createPersistJSONStorage() {
  return createJSONStorage(() => {
    if (typeof window === 'undefined') {
      return noopPersistStateStorage;
    }
    try {
      return getLocalStorageOrMemory();
    } catch {
      return noopPersistStateStorage;
    }
  });
}

export function localStorageGetItem(key: string): string | null {
  if (!isLocalStorageUsable()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function localStorageSetItem(key: string, value: string): void {
  if (!isLocalStorageUsable()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

export function localStorageRemoveItem(key: string): void {
  if (!isLocalStorageUsable()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

export function isStorageAccessError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'SecurityError'
  );
}
