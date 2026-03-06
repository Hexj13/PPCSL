'use client';

import { LoadMoreButton } from '@/components/listing/LoadMoreButton';
import { useTranslation } from '@/hooks/useTranslation';

const VEHICLE_TYPE_FILTERS = [
  { value: '' as const, labelKey: 'admin.brandsModelsTab.filterAll' },
  { value: 'car' as const, labelKey: 'admin.brandsModelsTab.vehicleTypeCar' },
  { value: 'truck' as const, labelKey: 'admin.brandsModelsTab.vehicleTypeTruck' },
  { value: 'moto' as const, labelKey: 'admin.brandsModelsTab.vehicleTypeMoto' },
];

type VehicleTypeFilter = '' | 'car' | 'truck' | 'moto';

interface BrandsModelsFiltersProps {
  searchQuery: string;
  vehicleType: VehicleTypeFilter;
  onSearchChange: (value: string) => void;
  onVehicleTypeChange: (value: VehicleTypeFilter) => void;
  onAddBrand: () => void;
  onAddModel: () => void;
}

export function BrandsModelsFilters({
  searchQuery,
  vehicleType,
  onSearchChange,
  onVehicleTypeChange,
  onAddBrand,
  onAddModel,
}: BrandsModelsFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 md:mb-6 flex flex-col gap-4">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t('admin.brandsModelsTab.searchPlaceholder')}
        className="w-full px-4 py-2.5 md:py-3 rounded-lg bg-bg-secondary border-2 border-primary-700 text-text-primary placeholder:text-text-secondary focus:outline-hidden focus:border-primary-900 transition-all duration-200 h-[48px] md:h-[52px] text-sm md:text-base"
      />
      <div className="pt-4 border-t border-primary-500/20 sm:border-t-0 sm:pt-0 flex flex-wrap gap-2 md:gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 md:gap-3">
          {VEHICLE_TYPE_FILTERS.map(({ value, labelKey }) => (
            <button
              key={value || 'all'}
              type="button"
              onClick={() => onVehicleTypeChange(value)}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium text-base transition-colors ${
                vehicleType === value
                  ? 'bg-primary-500/10 border-2 border-primary-700 text-primary-700'
                  : 'bg-bg-secondary hover-only:hover:bg-bg-base border-2 border-primary-700 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900'
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full sm:w-auto">
          <LoadMoreButton
            variant="inline"
            className="w-full sm:w-auto justify-center"
            onClick={onAddBrand}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {t('admin.brandsModelsTab.addBrand')}
          </LoadMoreButton>
          <LoadMoreButton
            variant="inline"
            className="w-full sm:w-auto justify-center"
            onClick={onAddModel}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {t('admin.brandsModelsTab.addModel')}
          </LoadMoreButton>
        </div>
      </div>
    </div>
  );
}
