import { renderHook } from '@testing-library/react';

import {
  forceReleaseScrollLockToTop,
  prepareScrollLockReleaseToTop,
  useScrollLock,
} from './useScrollLock';

describe('useScrollLock', () => {
  beforeEach(() => {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.left = '';
    Object.defineProperty(window, 'scrollY', { value: 400, writable: true, configurable: true });
    window.scrollTo = jest.fn();
  });

  it('restores previous scroll position when the menu closes without navigation', () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.top).toBe('-400px');

    unmount();

    expect(document.body.style.position).toBe('');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 400);
  });

  it('releases scroll at the top after navigation from the mobile menu', () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    prepareScrollLockReleaseToTop();
    unmount();

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('force-releases immediately to the top', () => {
    renderHook(() => useScrollLock(true));
    forceReleaseScrollLockToTop();

    expect(document.body.style.position).toBe('');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
