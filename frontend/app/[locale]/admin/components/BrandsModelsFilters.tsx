'use client';

import { useTranslation } from '@/hooks/useTranslation';

import { AdminActionButton, AdminFilterButton } from './AdminButtons';
import { AdminSearchInput } from './AdminTableShared';

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
      <AdminSearchInput
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t('admin.brandsModelsTab.searchPlaceholder')}
      />
      <div className="pt-4 border-t border-primary-500/20 sm:border-t-0 sm:pt-0 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 md:gap-3 min-w-0 sm:flex-1">
          {VEHICLE_SEGMENT_KEYS.map(({ value, labelKey }) => (
            <AdminFilterButton
              key={value || 'v-all'}
              onClick={() => {
                onCatalogChange('vehicle');
                onVehicleSegmentChange(value);
              }}
              active={catalog === 'vehicle' && vehicleSegment === value}
            >
              {t(labelKey)}
            </AdminFilterButton>
          ))}
          <AdminFilterButton onClick={() => onCatalogChange('tire')} active={catalog === 'tire'}>
            {t('admin.brandsModelsTab.filterTires')}
          </AdminFilterButton>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 md:gap-3 sm:ml-2 md:w-auto md:flex-row md:flex-wrap md:justify-end">
          <AdminActionButton fullWidth className="md:w-auto" onClick={onAddBrand}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {t('admin.brandsModelsTab.addBrand')}
          </AdminActionButton>
          <AdminActionButton fullWidth className="md:w-auto" onClick={onAddModel}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {t('admin.brandsModelsTab.addModel')}
          </AdminActionButton>
        </div>
      </div>
    </div>
  );
}
