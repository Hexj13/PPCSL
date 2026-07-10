import { act, renderHook } from '@testing-library/react';

import {
  forceReleaseScrollLockToTop,
  prepareScrollLockReleaseTo,
  prepareScrollLockReleaseToTop,
  useScrollLock,
} from './useScrollLock';

function flushRequestAnimationFrames(times = 2) {
  for (let i = 0; i < times; i += 1) {
    act(() => {
      jest.runOnlyPendingTimers();
    });
  }
}

describe('useScrollLock', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    let rafId = 0;
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      const id = ++rafId;
      setTimeout(() => callback(performance.now()), 0);
      return id;
    };
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.left = '';
    document.body.style.overflow = '';
    document.body.style.overscrollBehavior = '';
    document.documentElement.style.overflow = '';
    document.documentElement.style.overscrollBehavior = '';
    Object.defineProperty(window, 'scrollY', { value: 400, writable: true, configurable: true });
    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('restores previous scroll position when the menu closes without navigation', () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.position).toBe('');
    expect(document.body.style.overscrollBehavior).toBe('none');
    expect(document.documentElement.style.overflow).toBe('hidden');

    act(() => {
      unmount();
    });

    expect(document.body.style.position).toBe('');
    expect(document.body.style.overscrollBehavior).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 400);
  });

  it('releases scroll at the top after navigation from the mobile menu', () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    prepareScrollLockReleaseToTop();
    act(() => {
      unmount();
    });

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('releases scroll to a custom position when prepareScrollLockReleaseTo was called', () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    prepareScrollLockReleaseTo(820);
    act(() => {
      unmount();
    });

    expect(window.scrollTo).toHaveBeenCalledWith(0, 820);
  });

  it('runs a deferred correction only when scroll position drifts after unlock', () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    act(() => {
      unmount();
    });
    expect(window.scrollTo).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'scrollY', { value: 320, writable: true, configurable: true });
    flushRequestAnimationFrames();

    expect(window.scrollTo).toHaveBeenCalledWith(0, 400);
    expect(window.scrollTo).toHaveBeenCalledTimes(2);
  });

  it('force-releases immediately to the top', () => {
    renderHook(() => useScrollLock(true));
    forceReleaseScrollLockToTop();

    expect(document.body.style.position).toBe('');
    expect(document.body.style.overscrollBehavior).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
