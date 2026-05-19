import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

import type { SearchParams } from '@/synced/api-types';

import {
  defaultCatalogSearchParams,
  normalizeCatalogSearchParams,
} from '@/catalog/catalogSearchParams';

export { defaultCatalogSearchParams, normalizeCatalogSearchParams };

type MobileCatalogSearchContextValue = {
  committedFilters: SearchParams;
  setCommittedFilters: Dispatch<SetStateAction<SearchParams>>;
  baselineDraftParams: () => SearchParams;
  applyParams: (params: SearchParams) => void;
};

const MobileCatalogSearchContext = createContext<MobileCatalogSearchContextValue | null>(null);

export function MobileCatalogSearchProvider({ children }: { children: ReactNode }) {
  const [committedFilters, setCommittedFiltersState] = useState<SearchParams>(() =>
    normalizeCatalogSearchParams(defaultCatalogSearchParams('vehicle')),
  );

  const setCommittedFilters: Dispatch<SetStateAction<SearchParams>> = useCallback((action) => {
    setCommittedFiltersState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      return normalizeCatalogSearchParams(next);
    });
  }, []);

  const baselineDraftParams = useCallback((): SearchParams => {
    return normalizeCatalogSearchParams(committedFilters);
  }, [committedFilters]);

  const applyParams = useCallback(
    (params: SearchParams) => {
      setCommittedFilters(normalizeCatalogSearchParams(params));
    },
    [setCommittedFilters],
  );

  const value = useMemo(
    () => ({
      committedFilters,
      setCommittedFilters,
      baselineDraftParams,
      applyParams,
    }),
    [committedFilters, baselineDraftParams, applyParams],
  );

  return (
    <MobileCatalogSearchContext.Provider value={value}>{children}</MobileCatalogSearchContext.Provider>
  );
}

export function useMobileCatalogSearch() {
  const ctx = useContext(MobileCatalogSearchContext);
  if (!ctx) {
    throw new Error('useMobileCatalogSearch must be used within MobileCatalogSearchProvider');
  }
  return ctx;
}
