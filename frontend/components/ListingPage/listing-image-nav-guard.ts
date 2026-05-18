import type { MutableRefObject } from 'react';

export function clearImageNavGuard(
  syncClickLockRef: MutableRefObject<boolean>,
  syncUnlockTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
): void {
  syncClickLockRef.current = false;
  if (syncUnlockTimeoutRef.current) {
    clearTimeout(syncUnlockTimeoutRef.current);
    syncUnlockTimeoutRef.current = null;
  }
}

export function tryRunWithSyncImageNavLock(options: {
  isActive: boolean;
  syncClickLockRef: MutableRefObject<boolean>;
  syncUnlockTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  run: () => void;
}): void {
  const { isActive, syncClickLockRef, syncUnlockTimeoutRef, run } = options;
  if (!isActive) {
    run();
    return;
  }
  if (syncClickLockRef.current) {
    return;
  }
  syncClickLockRef.current = true;
  try {
    run();
  } finally {
    if (syncUnlockTimeoutRef.current) {
      clearTimeout(syncUnlockTimeoutRef.current);
    }
    syncUnlockTimeoutRef.current = setTimeout(() => {
      syncUnlockTimeoutRef.current = null;
      syncClickLockRef.current = false;
    }, 0);
  }
}
