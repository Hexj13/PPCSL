/** @jest-environment jsdom */

import { renderHook, act } from '@testing-library/react';

import { setListingViewMode } from '@/lib/listing-view-mode';

import { resolveGridColumns, useGridColumns, useListingGridColumns } from './useGridColumns';

describe('useGridColumns', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.localStorage.clear();
    setListingViewMode('large');
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches:
        query === '(min-width: 1280px)' ? false : query === '(min-width: 1024px)' ? true : false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('resolves columns from matchMedia breakpoints', () => {
    expect(resolveGridColumns()).toBe(3);
  });

  it('initializes columns from resolveGridColumns on first render', () => {
    const { result } = renderHook(() => useGridColumns());
    expect(result.current).toBe(resolveGridColumns());
  });

  it('updates columns when breakpoint media query changes', () => {
    const listeners = new Map<string, () => void>();
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn((_event: string, listener: () => void) => {
        listeners.set(query, listener);
      }),
      removeEventListener: jest.fn((event: string, listener: () => void) => {
        if (listeners.get(query) === listener) {
          listeners.delete(query);
        }
      }),
      dispatchEvent: jest.fn(),
    }));

    const { result } = renderHook(() => useGridColumns());
    expect(result.current).toBe(1);

    act(() => {
      listeners.get('(min-width: 1280px)')?.();
    });

    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === '(min-width: 1280px)',
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    act(() => {
      listeners.get('(min-width: 1280px)')?.();
    });

    expect(result.current).toBe(4);
  });

  it('uses two columns on mobile when compact view is selected', () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    setListingViewMode('compact');

    const { result } = renderHook(() => useListingGridColumns());
    expect(result.current).toEqual({ columns: 2, compactCards: true });
  });

  it('keeps desktop columns when compact view is selected', () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === '(min-width: 1024px)',
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    setListingViewMode('compact');

    const { result } = renderHook(() => useListingGridColumns());
    expect(result.current).toEqual({ columns: 3, compactCards: false });
  });
});
