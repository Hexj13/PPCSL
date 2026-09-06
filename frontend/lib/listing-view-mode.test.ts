/** @jest-environment jsdom */

import {
  LISTING_VIEW_MODE_STORAGE_KEY,
  readListingViewMode,
  setListingViewMode,
  subscribeListingViewMode,
} from './listing-view-mode';

describe('listing-view-mode', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to large when storage is empty', () => {
    expect(readListingViewMode()).toBe('large');
  });

  it('returns stored compact mode', () => {
    window.localStorage.setItem(LISTING_VIEW_MODE_STORAGE_KEY, 'compact');
    expect(readListingViewMode()).toBe('compact');
  });

  it('falls back to large for invalid stored values', () => {
    window.localStorage.setItem(LISTING_VIEW_MODE_STORAGE_KEY, 'grid');
    expect(readListingViewMode()).toBe('large');
  });

  it('persists mode and notifies subscribers', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeListingViewMode(listener);

    setListingViewMode('compact');

    expect(window.localStorage.getItem(LISTING_VIEW_MODE_STORAGE_KEY)).toBe('compact');
    expect(readListingViewMode()).toBe('compact');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
