import { act } from '@testing-library/react';

import { clearImageNavGuard, tryRunWithSyncImageNavLock } from './listing-image-nav-guard';

describe('tryRunWithSyncImageNavLock', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('runs immediately when isActive is false', () => {
    const syncClickLockRef = { current: false };
    const syncUnlockTimeoutRef = { current: null as ReturnType<typeof setTimeout> | null };
    const run = jest.fn();
    tryRunWithSyncImageNavLock({
      isActive: false,
      syncClickLockRef,
      syncUnlockTimeoutRef,
      run,
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(syncClickLockRef.current).toBe(false);
  });

  it('ignores a nested call while the sync lock is held', () => {
    const syncClickLockRef = { current: false };
    const syncUnlockTimeoutRef = { current: null as ReturnType<typeof setTimeout> | null };
    const outer = jest.fn();
    const inner = jest.fn();
    tryRunWithSyncImageNavLock({
      isActive: true,
      syncClickLockRef,
      syncUnlockTimeoutRef,
      run: () => {
        outer();
        tryRunWithSyncImageNavLock({
          isActive: true,
          syncClickLockRef,
          syncUnlockTimeoutRef,
          run: inner,
        });
      },
    });
    expect(outer).toHaveBeenCalledTimes(1);
    expect(inner).not.toHaveBeenCalled();
  });

  it('ignores a second top-level call until the unlock timer runs', () => {
    const syncClickLockRef = { current: false };
    const syncUnlockTimeoutRef = { current: null as ReturnType<typeof setTimeout> | null };
    const first = jest.fn();
    const second = jest.fn();
    tryRunWithSyncImageNavLock({
      isActive: true,
      syncClickLockRef,
      syncUnlockTimeoutRef,
      run: first,
    });
    tryRunWithSyncImageNavLock({
      isActive: true,
      syncClickLockRef,
      syncUnlockTimeoutRef,
      run: second,
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tryRunWithSyncImageNavLock({
      isActive: true,
      syncClickLockRef,
      syncUnlockTimeoutRef,
      run: second,
    });
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('clears lock and pending unlock via clearImageNavGuard', () => {
    const syncClickLockRef = { current: false };
    const syncUnlockTimeoutRef = { current: null as ReturnType<typeof setTimeout> | null };
    tryRunWithSyncImageNavLock({
      isActive: true,
      syncClickLockRef,
      syncUnlockTimeoutRef,
      run: () => {},
    });
    expect(syncClickLockRef.current).toBe(true);
    clearImageNavGuard(syncClickLockRef, syncUnlockTimeoutRef);
    expect(syncClickLockRef.current).toBe(false);
    expect(syncUnlockTimeoutRef.current).toBeNull();
  });
});
