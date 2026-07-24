import { useCallback, useEffect, useRef, useState } from 'react';

import type { PaginatedResponse, PaginationMeta } from '@/lib/api';

interface UsePaginatedDataOptions<T, F> {
  fetchFn: (_page: number, _limit: number, _filters: F) => Promise<PaginatedResponse<T>>;
  limit?: number;
  initialFilters: F;
  showLoadingDelay?: number;
  onDataTransform?: (_data: T[], _filters: F) => T[];
  debounceFilters?: (keyof F)[];
  debounceMs?: number;
}

interface UsePaginatedDataReturn<T, F> {
  data: T[];
  loading: boolean;
  loadingMore: boolean;
  meta: PaginationMeta | null;
  page: number;
  filters: F;
  setFilters: (_filters: F | ((_prev: F) => F)) => void;
  setPage: (_page: number) => void;
  loadMore: () => void;
  reload: (_keepPage?: boolean) => void;
  reloadAsync: (_keepPage?: boolean) => Promise<boolean | undefined>;
  setData: React.Dispatch<React.SetStateAction<T[]>>;
}

export function usePaginatedData<T, F>(
  options: UsePaginatedDataOptions<T, F>,
): UsePaginatedDataReturn<T, F> {
  const {
    fetchFn,
    limit = 20,
    initialFilters,
    showLoadingDelay = 200,
    onDataTransform,
    debounceFilters,
    debounceMs = 500,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFiltersState] = useState<F>(initialFilters);
  const [debouncedFilters, setDebouncedFilters] = useState<F>(initialFilters);

  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const hasDataRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const showLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDebouncedFiltersRef = useRef<F>(initialFilters);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const hasNonDebouncedFilterChange = useCallback(
    (prev: F, next: F): boolean => {
      const debouncedKeys = new Set(debounceFilters ?? []);
      const prevRecord = prev as Record<string, unknown>;
      const nextRecord = next as Record<string, unknown>;
      const allKeys = new Set([...Object.keys(prevRecord), ...Object.keys(nextRecord)]);
      for (const key of allKeys) {
        if (debouncedKeys.has(key as keyof F)) {
          continue;
        }
        if (prevRecord[key] !== nextRecord[key]) {
          return true;
        }
      }
      return false;
    },
    [debounceFilters],
  );

  const clearStaleDataForFilterChange = useCallback(() => {
    if (showLoadingTimeoutRef.current) {
      clearTimeout(showLoadingTimeoutRef.current);
      showLoadingTimeoutRef.current = null;
    }
    hasDataRef.current = false;
    setData([]);
    setLoading(true);
  }, []);

  const load = useCallback(
    async (
      targetPage: number,
      append = false,
      filtersToUse: F = debouncedFilters,
    ): Promise<boolean | undefined> => {
      if (append && loadingMoreRef.current) {
        return undefined;
      }
      if (!append && loadingRef.current) {
        return undefined;
      }

      if (append) {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      } else {
        loadingRef.current = true;
        if (!hasDataRef.current) {
          setLoading(true);
        } else {
          showLoadingTimeoutRef.current = setTimeout(() => {
            setLoading(true);
          }, showLoadingDelay);
        }
      }

      try {
        const result = await fetchFn(targetPage, limit, filtersToUse);
        let transformedData = result.data;

        if (onDataTransform) {
          transformedData = onDataTransform(result.data, filtersToUse);
        }

        if (append) {
          setData((prev) => {
            const existingIds = new Set(
              prev.map((item) => (item as { id?: string }).id).filter((id): id is string => !!id),
            );
            const uniqueNewItems = transformedData.filter(
              (item) => !existingIds.has((item as { id?: string }).id as string),
            );
            return [...prev, ...uniqueNewItems];
          });
        } else {
          setData(transformedData);
        }
        setMeta(result.meta);
        setPage(targetPage);
        hasDataRef.current = true;
        return true;
      } catch (error) {
        if (!append) {
          setData([]);
        }
        console.error('Error loading paginated data:', error);
        return false;
      } finally {
        if (showLoadingTimeoutRef.current) {
          clearTimeout(showLoadingTimeoutRef.current);
          showLoadingTimeoutRef.current = null;
        }
        setLoading(false);
        setLoadingMore(false);
        loadingRef.current = false;
        loadingMoreRef.current = false;
      }
    },
    [fetchFn, limit, debouncedFilters, showLoadingDelay, onDataTransform],
  );

  const setFilters = useCallback(
    (newFilters: F | ((_prev: F) => F)) => {
      const prev = filtersRef.current;
      const updated =
        typeof newFilters === 'function' ? (newFilters as (_prev: F) => F)(prev) : newFilters;

      if (hasInitializedRef.current && hasNonDebouncedFilterChange(prev, updated)) {
        clearStaleDataForFilterChange();
      }

      setFiltersState(updated);
    },
    [hasNonDebouncedFilterChange, clearStaleDataForFilterChange],
  );

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      void load(1, false, initialFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasInitializedRef.current) return;

    const prev = prevDebouncedFiltersRef.current;
    const shouldDebounce =
      debounceFilters &&
      debounceFilters.some((key) => {
        const filterValue = (filters as Record<string, unknown>)[key as string];
        const prevValue = (prev as Record<string, unknown>)[key as string];
        return filterValue !== prevValue;
      });

    if (shouldDebounce) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        clearStaleDataForFilterChange();
        prevDebouncedFiltersRef.current = filters;
        setDebouncedFilters(filters);
      }, debounceMs);
    } else {
      prevDebouncedFiltersRef.current = filters;
      setDebouncedFilters(filters);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filters, debounceFilters, debounceMs, clearStaleDataForFilterChange]);

  useEffect(() => {
    if (!hasInitializedRef.current) return;
    hasDataRef.current = false;
    setPage(1);
    void load(1, false, debouncedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilters]);

  const loadMore = useCallback(() => {
    const totalPages = meta?.totalPages ?? 1;
    if (meta && page < totalPages && !loadingMore) {
      void load(page + 1, true);
    }
  }, [meta, page, loadingMore, load]);

  const reload = useCallback(
    (keepPage = false) => {
      hasDataRef.current = false;
      const targetPage = keepPage ? page : 1;
      void load(targetPage, false, debouncedFilters);
    },
    [load, debouncedFilters, page],
  );

  const reloadAsync = useCallback(
    (keepPage = false) => {
      hasDataRef.current = false;
      const targetPage = keepPage ? page : 1;
      return load(targetPage, false, debouncedFilters);
    },
    [load, debouncedFilters, page],
  );

  const handleSetPage = useCallback(
    (newPage: number) => {
      void load(newPage, false, debouncedFilters);
    },
    [load, debouncedFilters],
  );

  return {
    data,
    loading,
    loadingMore,
    meta,
    page,
    filters,
    setFilters,
    setPage: handleSetPage,
    loadMore,
    reload,
    reloadAsync,
    setData,
  };
}
