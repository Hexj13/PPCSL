'use client';

import { LoadMoreButton } from '@/components/listing/LoadMoreButton';
import { useTranslation } from '@/hooks/useTranslation';

export type CatalogMode = 'vehicle' | 'tire';

type Segment = '' | 'car' | 'truck' | 'moto';

const VEHICLE_SEGMENT_KEYS = [
  { value: '' as const, labelKey: 'admin.brandsModelsTab.filterAll' },
  { value: 'car' as const, labelKey: 'admin.brandsModelsTab.vehicleTypeCar' },
  { value: 'truck' as const, labelKey: 'admin.brandsModelsTab.vehicleTypeTruck' },
  { value: 'moto' as const, labelKey: 'admin.brandsModelsTab.vehicleTypeMoto' },
];

interface BrandsModelsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  catalog: CatalogMode;
  onCatalogChange: (catalog: CatalogMode) => void;
  vehicleSegment: Segment;
  onVehicleSegmentChange: (value: Segment) => void;
  onAddBrand: () => void;
  onAddModel: () => void;
}

export function BrandsModelsFilters({
  searchQuery,
  onSearchChange,
  catalog,
  onCatalogChange,
  vehicleSegment,
  onVehicleSegmentChange,
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
      <div className="pt-4 border-t border-primary-500/20 sm:border-t-0 sm:pt-0 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 md:gap-3 min-w-0 sm:flex-1">
          {VEHICLE_SEGMENT_KEYS.map(({ value, labelKey }) => (
            <button
              key={value || 'v-all'}
              type="button"
              onClick={() => {
                onCatalogChange('vehicle');
                onVehicleSegmentChange(value);
              }}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium text-base transition-colors ${
                catalog === 'vehicle' && vehicleSegment === value
                  ? 'bg-primary-500/10 border-2 border-primary-700 text-primary-700'
                  : 'bg-bg-secondary hover-only:hover:bg-bg-base border-2 border-primary-700 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900'
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onCatalogChange('tire')}
            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium text-base transition-colors ${
              catalog === 'tire'
                ? 'bg-primary-500/10 border-2 border-primary-700 text-primary-700'
                : 'bg-bg-secondary hover-only:hover:bg-bg-base border-2 border-primary-700 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900'
            }`}
          >
            {t('admin.brandsModelsTab.filterTires')}
          </button>
        </div>
        <div className="flex flex-row flex-wrap gap-2 md:gap-3 justify-end shrink-0 sm:ml-2">
          <LoadMoreButton variant="inline" className="justify-center" onClick={onAddBrand}>
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
          <LoadMoreButton variant="inline" className="justify-center" onClick={onAddModel}>
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
