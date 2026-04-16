'use client';

import { useQuery } from '@tanstack/react-query';

import type { City } from '@/lib/api';
import { citiesApi } from '@/lib/api';
import { sortByName } from '@/lib/utils';

async function fetchCities(): Promise<City[]> {
  const res = await citiesApi.getAll();
  return sortByName(res.data);
}

export function useCities() {
  const { data: cities = [], isLoading: loading } = useQuery<City[]>({
    queryKey: ['cities'],
    queryFn: fetchCities,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });

  return { cities, loading };
}
