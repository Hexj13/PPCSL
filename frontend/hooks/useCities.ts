'use client';

import { useEffect, useState } from 'react';

import type { City } from '@/lib/api';
import { citiesApi } from '@/lib/api';
import { sortByName } from '@/lib/utils';

const STALE_MS = 10 * 60_000;

let citiesCache: City[] | null = null;
let citiesFetchedAt = 0;
let citiesPromise: Promise<City[]> | null = null;

const skipPersistentCache = process.env.NODE_ENV === 'test';

function isCacheFresh(): boolean {
  if (skipPersistentCache || !citiesCache) return false;
  return Date.now() - citiesFetchedAt < STALE_MS;
}

function getCachedCities(): City[] | null {
  return isCacheFresh() ? citiesCache : null;
}

function loadCities(): Promise<City[]> {
  const cachedCities = getCachedCities();
  if (cachedCities) {
    return Promise.resolve(cachedCities);
  }
  if (!citiesPromise) {
    citiesPromise = citiesApi
      .getAll()
      .then((res) => sortByName(res.data))
      .then((sorted) => {
        if (!skipPersistentCache) {
          citiesCache = sorted;
          citiesFetchedAt = Date.now();
        }
        return sorted;
      })
      .finally(() => {
        citiesPromise = null;
      });
  }
  return citiesPromise;
}

export function useCities() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cachedCities = getCachedCities();

    if (cachedCities) {
      setCities(cachedCities);
      setLoading(false);
      return;
    }

    setLoading(true);
    loadCities()
      .then((data) => {
        if (cancelled) return;
        setCities(data);
      })
      .catch(() => {
        if (cancelled) return;
        setCities([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { cities, loading };
}
