'use client';

import { useEffect, useMemo, useState } from 'react';

import { PopularFilterChip } from '@/components/search/search-filters/PopularFilterPickers';
import { useTranslation } from '@/hooks/useTranslation';
import type { Brand } from '@/lib/api';
import { MAX_SEARCH_BRAND_SELECTIONS } from '@/lib/constants';
import {
  groupBrandsByPopularCountry,
  POPULAR_BRAND_COUNTRY_FLAGS,
} from '@/lib/content/popular-brand-countries';
import { toast } from '@/lib/toast';

interface PopularCountryBrandsFilterProps {
  brands: Brand[];
  selectedBrandIds: string[];
  onSelectionChange: (brandIds: string[]) => void;
}

export function PopularCountryBrandsFilter({
  brands,
  selectedBrandIds,
  onSelectionChange,
}: PopularCountryBrandsFilterProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const countryGroups = useMemo(() => groupBrandsByPopularCountry(brands), [brands]);
  const selectedBrandIdSet = useMemo(() => new Set(selectedBrandIds), [selectedBrandIds]);

  if (!mounted || countryGroups.length === 0) {
    return null;
  }

  const handleCountryClick = (brandIds: string[]) => {
    const countryIdSet = new Set(brandIds);
    const allSelected = brandIds.every((id) => selectedBrandIdSet.has(id));

    if (allSelected) {
      onSelectionChange(selectedBrandIds.filter((id) => !countryIdSet.has(id)));
      return;
    }

    const missingIds = brandIds.filter((id) => !selectedBrandIdSet.has(id));
    const availableSlots = MAX_SEARCH_BRAND_SELECTIONS - selectedBrandIds.length;
    if (availableSlots <= 0) {
      toast.error(
        t('searchFilters.selectionLimitBrands', {
          max: MAX_SEARCH_BRAND_SELECTIONS.toString(),
        }),
      );
      return;
    }

    const idsToAdd = missingIds.slice(0, availableSlots);
    if (idsToAdd.length < missingIds.length) {
      toast.error(
        t('searchFilters.selectionLimitBrands', {
          max: MAX_SEARCH_BRAND_SELECTIONS.toString(),
        }),
      );
    }

    onSelectionChange([...selectedBrandIds, ...idsToAdd]);
  };

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-primary-900 mb-3">
        {t('searchFilters.popularBrandsByCountry')}
      </h3>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-4">
        {countryGroups.map(({ country, brandIds }) => {
          const selected = brandIds.every((id) => selectedBrandIdSet.has(id));
          const label = `${POPULAR_BRAND_COUNTRY_FLAGS[country]} ${t(`searchFilters.popularCountry.${country}`)} (+${brandIds.length})`;

          return (
            <PopularFilterChip
              key={country}
              label={label}
              selected={selected}
              onToggle={() => handleCountryClick(brandIds)}
            />
          );
        })}
      </div>
    </div>
  );
}
