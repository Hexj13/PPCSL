/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import type { useSearchParams } from 'next/navigation';

import { getDefaultFilters } from '@/lib/search/search-params-parse';
import { toast } from '@/lib/toast';

import { useFilterHandlers } from './useFilterHandlers';
import type { FilterState } from './useSearchFilters';

const mockReplace = jest.fn();

jest.mock('@/hooks/useLocalizedNavigation', () => ({
  useLocalizedNavigation: () => ({
    replace: mockReplace,
    push: jest.fn(),
    href: (path: string) => path,
    locale: 'en',
  }),
}));

jest.mock('@/lib/analytics', () => ({
  analytics: {
    searchDeferred: jest.fn(),
    selectContentDeferred: jest.fn(),
  },
}));

jest.mock('@/lib/toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

function createSearchParams(query = '') {
  const params = new URLSearchParams(query);
  return params as unknown as ReturnType<typeof useSearchParams>;
}

function createProps(overrides: Partial<Parameters<typeof useFilterHandlers>[0]> = {}) {
  const currentYear = '2026';
  const filters = (overrides.filters ?? getDefaultFilters(currentYear)) as FilterState;
  return {
    filters,
    updateFilter: jest.fn(),
    setFilters: jest.fn(),
    resetFilters: jest.fn(),
    brands: [],
    models: [],
    cities: [],
    vehicleType: 'car' as const,
    currentYear,
    searchParams: createSearchParams(),
    lastAppliedFilters: filters,
    hasActiveFilters: false,
    isSearching: false,
    setIsSearching: jest.fn(),
    setLastAppliedFilters: jest.fn(),
    isInternalSearchRef: { current: false },
    internalSearchNavigationRef: {
      current: {
        latestSearchParams: null,
        searchParamsHistory: new Set<string>(),
      },
    },
    getBrandOptions: () => [],
    getModelOptions: () => [],
    getCityOptions: () => [],
    t: (key: string) => key,
    ...overrides,
  };
}

function searchParamsFromReplaceUrl(url: string): URLSearchParams {
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  return new URLSearchParams(query);
}

describe('useFilterHandlers compact search', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    jest.mocked(toast.error).mockClear();
    window.sessionStorage.clear();
    Object.defineProperty(window, 'innerWidth', {
      value: 390,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'scrollTo', {
      value: jest.fn(),
      writable: true,
    });
  });

  it('does not set scrollToResultsAfterLoad on compact commit', () => {
    const { result } = renderHook(() => useFilterHandlers(createProps()));

    act(() => {
      result.current.commitCompactSearch({ body_types: ['Sedan'] });
    });

    expect(mockReplace).toHaveBeenCalled();
    expect(window.sessionStorage.getItem('scrollToResultsAfterLoad')).toBeNull();
  });

  it('clears a stale scrollToResultsAfterLoad flag on compact commit', () => {
    window.sessionStorage.setItem('scrollToResultsAfterLoad', 'true');
    const { result } = renderHook(() => useFilterHandlers(createProps()));

    act(() => {
      result.current.commitCompactSearch({ body_types: ['Sedan'] });
    });

    expect(window.sessionStorage.getItem('scrollToResultsAfterLoad')).toBeNull();
  });

  it('sets scrollToResultsAfterLoad on desktop apply', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 1280,
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useFilterHandlers(createProps()));

    act(() => {
      result.current.applySearchWithOverrides({ body_types: ['Sedan'] });
    });

    expect(window.sessionStorage.getItem('scrollToResultsAfterLoad')).toBe('true');
  });

  it('clears the internal navigation marker when the URL is unchanged', () => {
    const isInternalSearchRef = { current: false };
    const { result } = renderHook(() => useFilterHandlers(createProps({ isInternalSearchRef })));

    act(() => {
      result.current.applySearchWithOverrides({});
    });

    expect(isInternalSearchRef.current).toBe(false);
  });

  it('does not apply compact search on desktop width', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 1280,
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useFilterHandlers(createProps()));

    act(() => {
      result.current.commitCompactSearch({ body_types: ['Sedan'] });
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('queues a later compact commit while a search is in flight', () => {
    const { result, rerender } = renderHook(
      (props: ReturnType<typeof createProps>) => useFilterHandlers(props),
      { initialProps: createProps() },
    );

    act(() => {
      result.current.commitCompactSearch({ body_types: ['Sedan'] });
      result.current.commitCompactSearch({ body_types: ['SUV'] });
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(String(mockReplace.mock.calls[0]?.[0])).toContain('body_types=Sedan');

    rerender(createProps({ isSearching: true }));
    rerender(createProps({ isSearching: false }));

    expect(mockReplace.mock.calls.length).toBeGreaterThan(1);
    const lastUrl = String(mockReplace.mock.calls[mockReplace.mock.calls.length - 1]?.[0]);
    expect(lastUrl).toContain('body_types=SUV');
  });

  it('keeps the first in-flight compact fields when a later commit queues different keys', () => {
    const { result, rerender } = renderHook(
      (props: ReturnType<typeof createProps>) => useFilterHandlers(props),
      { initialProps: createProps() },
    );

    act(() => {
      result.current.commitCompactSearch({ fuels: ['Petrol'] });
      result.current.commitCompactSearch({ body_types: ['SUV'] });
    });

    rerender(createProps({ isSearching: true }));
    rerender(createProps({ isSearching: false }));

    const lastUrl = String(mockReplace.mock.calls[mockReplace.mock.calls.length - 1]?.[0]);
    expect(lastUrl).toContain('fuels=Petrol');
    expect(lastUrl).toContain('body_types=SUV');
  });

  it('queues a compact commit that reverts an in-flight change', () => {
    const { result, rerender } = renderHook(
      (props: ReturnType<typeof createProps>) => useFilterHandlers(props),
      { initialProps: createProps() },
    );

    act(() => {
      result.current.commitCompactSearch({ body_types: ['Sedan'] });
      result.current.commitCompactSearch({ body_types: [] });
    });

    rerender(createProps({ isSearching: true }));
    rerender(createProps({ isSearching: false }));

    expect(mockReplace).toHaveBeenCalledTimes(2);
    const lastUrl = String(mockReplace.mock.calls[1]?.[0]);
    expect(lastUrl).not.toContain('body_types=');
  });

  it('treats reordered tire size triples as unchanged', () => {
    const applied = {
      ...getDefaultFilters('2026'),
      listing_category: 'tire' as const,
      tire_widths: ['205', '225'],
      tire_profiles: ['55', '45'],
      tire_diameters: ['16', '17'],
    } as FilterState;
    const reordered = {
      ...applied,
      tire_widths: ['225', '205'],
      tire_profiles: ['45', '55'],
      tire_diameters: ['17', '16'],
    };

    const { result } = renderHook(() =>
      useFilterHandlers(
        createProps({
          filters: reordered,
          lastAppliedFilters: applied,
          hasActiveFilters: true,
        }),
      ),
    );

    expect(result.current.hasFiltersChanged).toBe(false);
  });

  it('detects a change when tire size tuple associations differ', () => {
    const applied = {
      ...getDefaultFilters('2026'),
      listing_category: 'tire' as const,
      tire_widths: ['205', '225'],
      tire_profiles: ['55', '45'],
      tire_diameters: ['16', '17'],
    } as FilterState;
    const changed = {
      ...applied,
      tire_profiles: ['45', '55'],
    };

    const { result } = renderHook(() =>
      useFilterHandlers(
        createProps({
          filters: changed,
          lastAppliedFilters: applied,
          hasActiveFilters: true,
        }),
      ),
    );

    expect(result.current.hasFiltersChanged).toBe(true);
  });

  it('ignores registration and seller selection order', () => {
    const applied = {
      ...getDefaultFilters('2026'),
      registration_types: ['registered', 'unregistered'],
      seller_types: ['Individual', 'Business'],
    } as FilterState;
    const reordered = {
      ...applied,
      registration_types: [...applied.registration_types].reverse(),
      seller_types: [...applied.seller_types].reverse(),
    };

    const { result } = renderHook(() =>
      useFilterHandlers(
        createProps({
          filters: reordered,
          lastAppliedFilters: applied,
          hasActiveFilters: true,
        }),
      ),
    );

    expect(result.current.hasFiltersChanged).toBe(false);
  });

  it('swaps inverted mileage on compact commit and does not toast', () => {
    const { result } = renderHook(() => useFilterHandlers(createProps()));

    act(() => {
      result.current.commitCompactSearch({ mileage_gte: '150000', mileage_lte: '50000' });
    });

    expect(mockReplace).toHaveBeenCalled();
    const params = searchParamsFromReplaceUrl(String(mockReplace.mock.calls[0][0]));
    expect(params.get('mileage_gte')).toBe('50000');
    expect(params.get('mileage_lte')).toBe('150000');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('swaps inverted price on compact commit and does not toast', () => {
    const { result } = renderHook(() => useFilterHandlers(createProps()));

    act(() => {
      result.current.commitCompactSearch({ price_gte: '8000', price_lte: '2000' });
    });

    expect(mockReplace).toHaveBeenCalled();
    const params = searchParamsFromReplaceUrl(String(mockReplace.mock.calls[0][0]));
    expect(params.get('price_gte')).toBe('2000');
    expect(params.get('price_lte')).toBe('8000');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('swaps inverted price on desktop apply and does not toast', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 1280,
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useFilterHandlers(createProps()));

    act(() => {
      result.current.applySearchWithOverrides({ price_gte: '8000', price_lte: '2000' });
    });

    expect(mockReplace).toHaveBeenCalled();
    const params = searchParamsFromReplaceUrl(String(mockReplace.mock.calls[0][0]));
    expect(params.get('price_gte')).toBe('2000');
    expect(params.get('price_lte')).toBe('8000');
    expect(toast.error).not.toHaveBeenCalled();
  });
});
