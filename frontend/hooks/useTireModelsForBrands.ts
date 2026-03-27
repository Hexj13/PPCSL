import { useEffect, useMemo, useRef, useState } from 'react';

import type { FilterState } from '@/hooks/useSearchFilters';
import type { TireModel } from '@/lib/api';
import { tiresApi } from '@/lib/api';
import { sortTireModelsForDisplay } from '@/lib/tire-catalog-sort';

export function useTireModelsForBrands(
  listingCategory: 'vehicle' | 'tire',
  tireBrandIds: string[],
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>,
): { tireModels: TireModel[]; loadingTireModels: boolean } {
  const [tireModels, setTireModels] = useState<TireModel[]>([]);
  const [loadingTireModels, setLoadingTireModels] = useState(false);
  const latestRequestRef = useRef(0);

  const tireBrandIdsKey = useMemo(() => [...tireBrandIds].sort().join(','), [tireBrandIds]);

  useEffect(() => {
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;

    if (listingCategory !== 'tire') {
      setTireModels([]);
      setLoadingTireModels(false);
      return;
    }
    if (tireBrandIds.length === 0) {
      setTireModels([]);
      setLoadingTireModels(false);
      setFilters((prev) => ({ ...prev, tire_model_ids: [] }));
      return;
    }
    setLoadingTireModels(true);
    Promise.all(tireBrandIds.map((id) => tiresApi.getModelsByBrand(id)))
      .then((responses) => {
        if (latestRequestRef.current !== requestId) {
          return;
        }
        const merged = responses.flatMap((r) => sortTireModelsForDisplay(r.data ?? []));
        const unique = Array.from(new Map(merged.map((m) => [m.id, m])).values());
        setTireModels(unique);
        setFilters((prev) => {
          const valid = prev.tire_model_ids.filter((id) => unique.some((m) => m.id === id));
          return { ...prev, tire_model_ids: valid };
        });
      })
      .catch(() => {
        if (latestRequestRef.current !== requestId) {
          return;
        }
        setTireModels([]);
      })
      .finally(() => {
        if (latestRequestRef.current === requestId) {
          setLoadingTireModels(false);
        }
      });
  }, [listingCategory, tireBrandIds, tireBrandIdsKey, setFilters]);

  return { tireModels, loadingTireModels };
}
