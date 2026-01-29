import { useEffect, useState } from 'react';

import { citiesApi, City } from '@/lib/api';
import { sortByName } from '@/lib/utils';

let citiesCache: City[] | null = null;
let citiesPromise: Promise<City[]> | null = null;

function fetchCities(): Promise<City[]> {
  if (citiesCache) return Promise.resolve(citiesCache);
  if (citiesPromise) return citiesPromise;
  citiesPromise = citiesApi
    .getAll()
    .then((res) => {
      citiesCache = sortByName(res.data);
      return citiesCache;
    })
    .catch(() => {
      citiesPromise = null;
      return [];
    });
  return citiesPromise;
}

export function useCities() {
  const [cities, setCities] = useState<City[]>(citiesCache ?? []);
  const [loading, setLoading] = useState(!citiesCache);

  useEffect(() => {
    let cancelled = false;
    fetchCities().then((data) => {
      if (!cancelled) {
        setCities(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { cities, loading };
}
