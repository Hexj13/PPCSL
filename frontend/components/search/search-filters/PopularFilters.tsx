'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePopularModels } from '@/hooks/usePopularModels';
import type { FilterState } from '@/hooks/useSearchFilters';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { Brand, PopularListingsData, VehicleModel } from '@/lib/api';
import { MAX_SEARCH_BRAND_SELECTIONS, MAX_SEARCH_MODEL_SELECTIONS } from '@/lib/constants';
import { POPULAR_BODY_TYPES_CAR, type PopularBodyTypeCar } from '@/lib/content/popular-body-types';
import { getPopularBrands } from '@/lib/content/popular-brands';
import { toast } from '@/lib/toast';
import { compareNames } from '@/lib/utils';
import { ChevronDownIcon } from '@/ui';

import {
  PopularFilterBrandTile,
  PopularFilterChip,
  popularVehicleBrandLogoUrl,
} from './PopularFilterPickers';
import { PopularStatistics } from './PopularStatistics';

interface PopularFiltersProps {
  brands: Brand[];
  models: VehicleModel[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  vehicleType: 'car' | 'truck' | 'moto';
  enableE2eTestIds?: boolean;
  popularData?: PopularListingsData | null;
  popularLoading?: boolean;
  popularError?: boolean;
}

export function PopularFilters({
  brands,
  models,
  filters,
  setFilters,
  vehicleType = 'car',
  enableE2eTestIds = false,
  popularData = null,
  popularLoading = false,
  popularError = false,
}: PopularFiltersProps) {
  const { t } = useTranslation();
  const blockRef = useRef<HTMLDivElement>(null);
  const [openBodyTypes, setOpenBodyTypes] = useState<Set<PopularBodyTypeCar>>(() => new Set());
  const [defaultOpenInitialized, setDefaultOpenInitialized] = useState(false);
  const { toggleModel, isModelSelected, toggleBrand, isBrandExplicitlySelected, selectedItems } =
    usePopularModels({
      brands,
      models,
      filters,
      setFilters,
      vehicleType,
      onBrandLimitReached: () =>
        toast.error(
          t('searchFilters.selectionLimitBrands', {
            max: MAX_SEARCH_BRAND_SELECTIONS.toString(),
          }),
        ),
      onModelLimitReached: () =>
        toast.error(
          t('searchFilters.selectionLimitModels', {
            max: MAX_SEARCH_MODEL_SELECTIONS.toString(),
          }),
        ),
    });

  const popularBrandsSorted = useMemo(() => {
    const brands = [...getPopularBrands(vehicleType)];
    const counts = popularData?.brandListingCounts;
    if (!counts) {
      return brands;
    }
    return brands.sort((a, b) => {
      const countDiff = (counts[b] ?? 0) - (counts[a] ?? 0);
      if (countDiff !== 0) return countDiff;
      return compareNames(a, b);
    });
  }, [vehicleType, popularData?.brandListingCounts]);

  const sortedBodyTypes = useMemo(() => {
    const counts = popularData?.bodyTypeListingCounts;
    if (!counts) {
      return [...POPULAR_BODY_TYPES_CAR];
    }
    return [...POPULAR_BODY_TYPES_CAR].sort((a, b) => {
      const countDiff = (counts[b.value] ?? 0) - (counts[a.value] ?? 0);
      if (countDiff !== 0) return countDiff;
      return compareNames(a.value, b.value);
    });
  }, [popularData?.bodyTypeListingCounts]);

  useEffect(() => {
    if (!popularData || defaultOpenInitialized || sortedBodyTypes.length === 0) return;
    const first = sortedBodyTypes[0]?.value;
    if (first) {
      setOpenBodyTypes(new Set([first]));
      setDefaultOpenInitialized(true);
    }
  }, [popularData, sortedBodyTypes, defaultOpenInitialized]);

  const toggleBodyType = useCallback(
    (bodyType: PopularBodyTypeCar) => {
      const willOpen = !openBodyTypes.has(bodyType);
      if (willOpen) {
        analytics.selectContentDeferred('popular_body_type', bodyType);
      }
      setOpenBodyTypes((prev) => {
        const next = new Set(prev);
        if (next.has(bodyType)) {
          next.delete(bodyType);
        } else {
          next.add(bodyType);
        }
        return next;
      });
    },
    [openBodyTypes],
  );

  if (popularBrandsSorted.length === 0) {
    return (
      <div className="mb-5">
        <div className="text-sm text-text-secondary">{t('searchFilters.noPopularBrands')}</div>
      </div>
    );
  }

  const showCarInsights = vehicleType === 'car';

  return (
    <div ref={blockRef} className="mb-5 scroll-mt-20">
      {showCarInsights && (
        <>
          {popularLoading && (
            <div className="text-sm text-text-secondary mb-4">
              {t('searchFilters.popularDataLoading')}
            </div>
          )}

          {popularError && !popularLoading && (
            <div className="text-sm text-text-secondary mb-4">
              {t('searchFilters.popularDataError')}
            </div>
          )}

          {!popularLoading && !popularError && popularData && (
            <PopularStatistics
              brands={popularData.statistics.brands}
              bodyTypes={popularData.statistics.bodyTypes}
              fuels={popularData.statistics.fuels}
            />
          )}
        </>
      )}

      <h3 className="text-sm font-medium text-primary-900 mb-3">
        {t('searchFilters.popularBrands')}
      </h3>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6 pt-2 w-full lg:flex lg:flex-nowrap">
        {popularBrandsSorted.map((brandName) => (
          <PopularFilterBrandTile
            key={brandName}
            label={brandName}
            imageSrc={popularVehicleBrandLogoUrl(brandName)}
            letterPlaceholder={vehicleType === 'truck' || vehicleType === 'moto'}
            selected={isBrandExplicitlySelected(brandName)}
            onToggle={() => toggleBrand(brandName)}
            listingCount={
              showCarInsights ? popularData?.brandListingCounts?.[brandName] : undefined
            }
          />
        ))}
      </div>

      {showCarInsights && (
        <>
          <div className="scroll-mt-20">
            <h3 className="text-sm font-medium text-primary-900 mb-3">
              {t('searchFilters.popularModels')}
            </h3>
          </div>

          {!popularLoading && !popularError && popularData && (
            <div className="space-y-2">
              {sortedBodyTypes.map(({ value }, index) => {
                const modelsForBody = [...(popularData.modelsByBodyType[value] ?? [])].sort(
                  (a, b) => {
                    const countDiff = b.listingCount - a.listingCount;
                    if (countDiff !== 0) return countDiff;
                    const brandDiff = compareNames(a.brandName, b.brandName);
                    if (brandDiff !== 0) return brandDiff;
                    return compareNames(a.modelName, b.modelName);
                  },
                );
                const isOpen = openBodyTypes.has(value);
                const isLast = index === sortedBodyTypes.length - 1;
                const bodyTypeTitle = t(`vehicleOptions.bodyType.${value}`);
                const contentId = `search-popular-body-type-${value}`;

                return (
                  <div key={value}>
                    <button
                      type="button"
                      className={`w-full flex items-center gap-1.5 text-left text-xs font-semibold text-primary-700 py-3 ${
                        isLast ? '' : 'border-b border-primary-500/20'
                      }`}
                      aria-expanded={isOpen}
                      aria-controls={contentId}
                      onClick={() => toggleBodyType(value)}
                      data-testid={
                        enableE2eTestIds ? `search-popular-body-type-${value}-toggle` : undefined
                      }
                    >
                      <span>{bodyTypeTitle}</span>
                      <ChevronDownIcon
                        className={`w-4 h-4 shrink-0 transition-transform duration-200 ease-out ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <div
                      id={contentId}
                      data-testid={
                        enableE2eTestIds ? `search-popular-body-type-${value}-content` : undefined
                      }
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="pt-3 pb-4">
                          {modelsForBody.length === 0 ? (
                            <p className="text-sm text-text-secondary">
                              {t('searchFilters.noPopularModelsForBodyType')}
                            </p>
                          ) : (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-4">
                              {modelsForBody.map(({ brandName, modelName }) => (
                                <PopularFilterChip
                                  key={`${brandName}-${modelName}`}
                                  dataTestId={
                                    enableE2eTestIds
                                      ? `search-popular-chip-${brandName}-${modelName}`
                                      : undefined
                                  }
                                  label={`${brandName} ${modelName}`}
                                  selected={isModelSelected(brandName, modelName)}
                                  onToggle={() => toggleModel(brandName, modelName)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-4 text-sm text-text-secondary">
            {t('searchFilters.youSelected')}{' '}
            {selectedItems.length > 0
              ? selectedItems
                  .map(({ brand, model }) => (model ? `${brand} ${model}` : brand))
                  .join(', ')
              : '—'}
          </p>
        </>
      )}
    </div>
  );
}
