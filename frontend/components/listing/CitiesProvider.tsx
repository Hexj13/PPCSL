'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { useCities } from '@/hooks/useCities';
import type { City } from '@/lib/api';

type CitiesContextValue = {
  cities: City[];
  loading: boolean;
};

const CitiesContext = createContext<CitiesContextValue | null>(null);

export function CitiesProvider({ children }: { children: ReactNode }) {
  const value = useCities();
  return <CitiesContext.Provider value={value}>{children}</CitiesContext.Provider>;
}

export function useListingGridCities(): CitiesContextValue {
  const context = useContext(CitiesContext);
  if (!context) {
    throw new Error('useListingGridCities must be used within CitiesProvider');
  }
  return context;
}
