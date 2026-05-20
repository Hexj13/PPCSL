import {
  sessionStorageGetItem,
  sessionStorageRemoveItem,
  sessionStorageSetItem,
} from '@/lib/browser-session-storage';

const STORAGE_KEY = 'authTransitionLoaderUntil';

export const AUTH_TRANSITION_LOADER_MIN_MS = 2000;

export function markAuthTransitionLoader(minMs = AUTH_TRANSITION_LOADER_MIN_MS): void {
  sessionStorageSetItem(STORAGE_KEY, String(Date.now() + minMs));
}

export function getAuthTransitionLoaderRemainingMs(): number {
  const raw = sessionStorageGetItem(STORAGE_KEY);
  if (!raw) return 0;
  const until = Number(raw);
  if (!Number.isFinite(until)) {
    return 0;
  }
  return Math.max(0, until - Date.now());
}

export function clearAuthTransitionLoader(): void {
  sessionStorageRemoveItem(STORAGE_KEY);
}

export function sleepMs(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function waitForAuthTransitionLoaderMinDisplay(
  startedAt: number | null,
  minMs = AUTH_TRANSITION_LOADER_MIN_MS,
): Promise<void> {
  const start = startedAt ?? Date.now();
  const elapsed = Date.now() - start;
  await sleepMs(Math.max(0, minMs - elapsed));
}
