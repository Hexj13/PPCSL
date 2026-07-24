import { act, renderHook, waitFor } from '@testing-library/react';

import { usePaginatedData } from './usePaginatedData';

jest.useFakeTimers();

type TestItem = { id: string; name: string };

type TestFilters = {
  roleFilter: string;
  searchQuery: string;
};

const initialItems: TestItem[] = [{ id: 'Individual', name: 'Alice' }];

function createFetchFn() {
  return jest.fn(
    async (
      _page: number,
      _limit: number,
      filters: TestFilters,
    ): Promise<{ data: TestItem[]; meta: { total: number; totalPages: number } }> => {
      const name = filters.roleFilter === 'Business' ? 'Bob' : 'Alice';
      return {
        data: [{ id: filters.roleFilter, name }],
        meta: { total: 1, totalPages: 1 },
      };
    },
  );
}

function renderPaginatedHook(fetchFn = createFetchFn()) {
  return renderHook(() =>
    usePaginatedData<TestItem, TestFilters>({
      fetchFn,
      initialFilters: { roleFilter: 'Individual', searchQuery: '' },
      debounceFilters: ['searchQuery'],
      debounceMs: 500,
      showLoadingDelay: 300,
    }),
  );
}

describe('usePaginatedData', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
  });

  it('clears data and shows loading immediately when a non-debounced filter changes', async () => {
    const fetchFn = createFetchFn();
    const { result } = renderPaginatedHook(fetchFn);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data).toEqual(initialItems);

    act(() => {
      result.current.setFilters((prev) => ({ ...prev, roleFilter: 'Business' }));
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.filters.roleFilter).toBe('Business');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data).toEqual([{ id: 'Business', name: 'Bob' }]);
  });

  it('keeps data while typing a debounced filter until debounce commits', async () => {
    const fetchFn = createFetchFn();
    const { result } = renderPaginatedHook(fetchFn);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data).toEqual(initialItems);

    act(() => {
      result.current.setFilters((prev) => ({ ...prev, searchQuery: 'a' }));
    });

    expect(result.current.data).toEqual(initialItems);
    expect(result.current.loading).toBe(false);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(fetchFn).toHaveBeenLastCalledWith(1, 20, expect.objectContaining({ searchQuery: 'a' }));
  });

  it('keeps previous page rows visible while paginating', async () => {
    const fetchFn = jest.fn(
      async (
        page: number,
        _limit: number,
        _filters: TestFilters,
      ): Promise<{ data: TestItem[]; meta: { total: number; totalPages: number } }> => {
        if (page === 1) {
          return {
            data: [{ id: '1', name: 'Page 1' }],
            meta: { total: 2, totalPages: 2 },
          };
        }
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              data: [{ id: '2', name: 'Page 2' }],
              meta: { total: 2, totalPages: 2 },
            });
          }, 100);
        });
      },
    );

    const { result } = renderPaginatedHook(fetchFn);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data).toEqual([{ id: '1', name: 'Page 1' }]);

    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.data).toEqual([{ id: '1', name: 'Page 1' }]);
    expect(result.current.loading).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: '2', name: 'Page 2' }]);
    });
    expect(result.current.loading).toBe(false);
  });
});
