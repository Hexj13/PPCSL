'use client';

import { useEffect, useState } from 'react';

import type { SearchParams } from '@/lib/api';
import { listingsApi } from '@/lib/api';
import { buildMinimalCategorySearchUrl, getParsedListingSearchParams } from '@/lib/search';

import { getVehicleTypeFromParams } from './listing-grid-state';

export function useListingGridWiderCategory(
  hasLoadedWithFilters: boolean,
  listingsLength: number,
  error: string | null,
  searchParamsString: string,
) {
  const [widerCategoryHasListings, setWiderCategoryHasListings] = useState<boolean | null>(null);

  useEffect(() => {
    if (!hasLoadedWithFilters || listingsLength > 0 || error) {
      setWiderCategoryHasListings(null);
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      setWiderCategoryHasListings(null);
      try {
        const minimalHref = buildMinimalCategorySearchUrl(new URLSearchParams(searchParamsString));
        const minimalQuery = minimalHref === '/' ? '' : minimalHref.slice(2);
        const vt = getVehicleTypeFromParams(minimalQuery || searchParamsString);
        const parsed = await getParsedListingSearchParams(minimalQuery, vt);
        const isTire = parsed.category === 'tire';
        const params: SearchParams = {
          ...parsed,
          ...(!isTire ? { vehicleType: vt } : {}),
          page: 1,
          limit: 1,
        };
        const res = await listingsApi.getAll(params, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setWiderCategoryHasListings((res.data.meta.total ?? 0) > 0);
        }
      } catch {
        if (!controller.signal.aborted) {
          setWiderCategoryHasListings(false);
        }
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [hasLoadedWithFilters, listingsLength, error, searchParamsString]);

  return widerCategoryHasListings;
}
