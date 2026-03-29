'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { FilterState } from '@/hooks/useSearchFilters';
import { useTranslation } from '@/hooks/useTranslation';
import type { TireBrand } from '@/lib/api';
import { MAX_SEARCH_BRAND_SELECTIONS, MAX_TIRE_SIZE_SELECTIONS } from '@/lib/constants';
import {
  normalizeTireNameKey,
  POPULAR_TIRE_BRAND_NAMES,
  POPULAR_TIRE_SIZES,
} from '@/lib/content/popular-tires';
import { toast } from '@/lib/toast';
import { compareNames } from '@/lib/utils';

import {
  PopularFilterBrandTile,
  PopularFilterChip,
  popularTireBrandLogoUrl,
} from './PopularFilterPickers';

const TIRE_POPULAR_LOGO_DEFAULT_SIZE_BRANDS = new Set(
  ['toyo', 'falken'].map((n) => normalizeTireNameKey(n)),
);

function getTirePopularBrandImageScale(brandName: string): number {
  const key = normalizeTireNameKey(brandName);
  if (key === 'michelin' || key === 'dunlop') return 2;
  if (TIRE_POPULAR_LOGO_DEFAULT_SIZE_BRANDS.has(key)) return 0.9;
  return 1.65;
}

function tireTriplesAligned(filters: FilterState): boolean {
  const w = filters.tire_widths;
  const p = filters.tire_profiles;
  const d = filters.tire_diameters;
  return w.length === p.length && p.length === d.length;
}

function findPopularSizeIndex(
  filters: FilterState,
  size: { width: string; profile: string; diameter: string },
): number {
  if (!tireTriplesAligned(filters)) return -1;
  for (let i = 0; i < filters.tire_widths.length; i++) {
    if (
      filters.tire_widths[i] === size.width &&
      filters.tire_profiles[i] === size.profile &&
      filters.tire_diameters[i] === size.diameter
    ) {
      return i;
    }
  }
  return -1;
}

interface TirePopularPanelProps {
  filters: FilterState;
  tireBrands: TireBrand[];
  onMultiSelectChange: (_key: keyof FilterState, _values: string[]) => void;
  updateMultiple: (_updates: Partial<FilterState>) => void;
}

export function TirePopularPanel({
  filters,
  tireBrands,
  onMultiSelectChange,
  updateMultiple,
}: TirePopularPanelProps) {
  const { t } = useTranslation();
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(max-width: 1024px)');
    const update = (event?: MediaQueryListEvent) => {
      setIsNarrowViewport(event ? event.matches : mql.matches);
    };
    update();
    mql.addEventListener('change', update);
    return () => {
      mql.removeEventListener('change', update);
    };
  }, []);

  const popularBrandsSorted = useMemo(() => [...POPULAR_TIRE_BRAND_NAMES].sort(compareNames), []);

  const toggleTireBrandPopular = (popularName: string) => {
    const brand = tireBrands.find(
      (b) => normalizeTireNameKey(b.name) === normalizeTireNameKey(popularName),
    );
    if (!brand) return;
    const has = filters.tire_brand_ids.includes(brand.id);
    if (has) {
      onMultiSelectChange(
        'tire_brand_ids',
        filters.tire_brand_ids.filter((id) => id !== brand.id),
      );
    } else if (filters.tire_brand_ids.length >= MAX_SEARCH_BRAND_SELECTIONS) {
      toast.error(
        t('searchFilters.selectionLimitBrands', {
          max: MAX_SEARCH_BRAND_SELECTIONS.toString(),
        }),
      );
    } else {
      onMultiSelectChange('tire_brand_ids', [...filters.tire_brand_ids, brand.id]);
    }
  };

  const isPopularBrandSelected = (popularName: string) => {
    const brand = tireBrands.find(
      (b) => normalizeTireNameKey(b.name) === normalizeTireNameKey(popularName),
    );
    return brand ? filters.tire_brand_ids.includes(brand.id) : false;
  };

  const isPopularSizeSelected = useCallback(
    (size: (typeof POPULAR_TIRE_SIZES)[number]) => findPopularSizeIndex(filters, size) >= 0,
    [filters],
  );

  const togglePopularSize = (size: (typeof POPULAR_TIRE_SIZES)[number]) => {
    const idx = findPopularSizeIndex(filters, size);
    if (idx >= 0) {
      const nw = [...filters.tire_widths];
      const np = [...filters.tire_profiles];
      const nd = [...filters.tire_diameters];
      nw.splice(idx, 1);
      np.splice(idx, 1);
      nd.splice(idx, 1);
      updateMultiple({ tire_widths: nw, tire_profiles: np, tire_diameters: nd });
      return;
    }
    let nw = [...filters.tire_widths];
    let np = [...filters.tire_profiles];
    let nd = [...filters.tire_diameters];
    if (!tireTriplesAligned(filters)) {
      nw = [size.width];
      np = [size.profile];
      nd = [size.diameter];
    } else if (nw.length >= MAX_TIRE_SIZE_SELECTIONS) {
      toast.error(
        t('searchFilters.selectionLimitTireSizes', {
          max: MAX_TIRE_SIZE_SELECTIONS.toString(),
        }),
      );
      return;
    } else {
      nw.push(size.width);
      np.push(size.profile);
      nd.push(size.diameter);
    }
    updateMultiple({ tire_widths: nw, tire_profiles: np, tire_diameters: nd });
  };

  const selectedSummary = useMemo(() => {
    const nameById = new Map(tireBrands.map((b) => [b.id, b.name]));
    const brandNames = filters.tire_brand_ids
      .map((id) => nameById.get(id))
      .filter((n): n is string => Boolean(n));
    brandNames.sort(compareNames);
    const parts: string[] = [...brandNames];
    if (tireTriplesAligned(filters) && filters.tire_widths.length > 0) {
      filters.tire_widths.forEach((w, i) => {
        parts.push(`${w}/${filters.tire_profiles[i]} R${filters.tire_diameters[i]}`);
      });
    }
    return parts.join(', ');
  }, [filters, tireBrands]);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-medium text-primary-900 mb-3">
          {t('searchFilters.popularTireBrands')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {popularBrandsSorted.map((brandName) => (
            <PopularFilterBrandTile
              key={brandName}
              label={brandName}
              imageSrc={popularTireBrandLogoUrl(brandName)}
              selected={isPopularBrandSelected(brandName)}
              onToggle={() => toggleTireBrandPopular(brandName)}
              imageScale={
                isNarrowViewport &&
                !TIRE_POPULAR_LOGO_DEFAULT_SIZE_BRANDS.has(normalizeTireNameKey(brandName))
                  ? 1.5
                  : getTirePopularBrandImageScale(brandName)
              }
            />
          ))}
        </div>
      </div>

      <div className="scroll-mt-20">
        <h3 className="text-sm font-medium text-primary-900 mb-3">
          {t('searchFilters.popularTireSizes')}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {POPULAR_TIRE_SIZES.map((size) => (
            <PopularFilterChip
              key={`${size.width}-${size.profile}-${size.diameter}`}
              label={`${size.width}/${size.profile} R${size.diameter}`}
              selected={isPopularSizeSelected(size)}
              onToggle={() => togglePopularSize(size)}
            />
          ))}
        </div>
      </div>

      <p className="mt-4 text-sm text-text-secondary">
        {t('searchFilters.youSelected')} {selectedSummary.length > 0 ? selectedSummary : '—'}
      </p>
    </div>
  );
}
