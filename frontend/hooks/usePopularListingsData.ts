'use client';

import { useEffect, useState } from 'react';

import { listingsApi, type PopularListingsData } from '@/lib/api';

type PopularListingsState = {
  data: PopularListingsData | null;
  loading: boolean;
  error: boolean;
};

const emptyState: PopularListingsState = {
  data: null,
  loading: false,
  error: false,
};

let cachedData: PopularListingsData | null = null;
let cachedPromise: Promise<PopularListingsData> | null = null;

export function clearPopularListingsCache(): void {
  cachedData = null;
  cachedPromise = null;
}

function loadPopularListings(): Promise<PopularListingsData> {
  if (cachedData) {
    return Promise.resolve(cachedData);
  }
  if (cachedPromise) {
    return cachedPromise;
  }
  cachedPromise = listingsApi
    .getPopular()
    .then((res) => {
      cachedData = res.data;
      return res.data;
    })
    .finally(() => {
      cachedPromise = null;
    });
  return cachedPromise;
}

export function usePopularListingsData(enabled: boolean): PopularListingsState {
  const [state, setState] = useState<PopularListingsState>(() =>
    enabled
      ? {
          data: cachedData,
          loading: !cachedData,
          error: false,
        }
      : emptyState,
  );

  useEffect(() => {
    if (!enabled) {
      setState(emptyState);
      return;
    }

    let cancelled = false;

    if (cachedData) {
      setState({ data: cachedData, loading: false, error: false });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: false }));
    loadPopularListings()
      .then((data) => {
        if (cancelled) return;
        setState({ data, loading: false, error: false });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ data: null, loading: false, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
