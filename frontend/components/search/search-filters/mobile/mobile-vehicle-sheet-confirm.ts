import type { FilterState } from '@/hooks/useSearchFilters';

import {
  normalizeEngineDisplacementRangeOrder,
  normalizeHorsepowerRangeOrder,
  normalizeMileageRangeOrder,
  normalizePriceRangeOrder,
  normalizeYearRangeOrder,
} from './mobile-search-filters-utils';

export type VehicleSheetConfirmDeps = {
  dismissSheet: () => void;
  onMultiSelectChange: (_key: keyof FilterState, _values: string[]) => void;
  onFilterChange: (_key: keyof FilterState, _value: string) => void;
  onYearBlur: (_key: string, _value: string) => void;
  onPriceBlur: (_key: string, _value: string) => void;
  handleMileageBlur: (_key: string, _value: string) => void;
  handleEngineBlur: (_key: string, _value: string) => void;
  handleHorsepowerBlur: (_key: string, _value: string) => void;
};

type ConfirmFn = (d: Partial<FilterState>, deps: VehicleSheetConfirmDeps) => void;

const VEHICLE_SHEET_CONFIRM: Record<string, ConfirmFn> = {
  vehicle_brand: (d, deps) => deps.onMultiSelectChange('brand_ids', d.brand_ids ?? []),
  vehicle_model: (d, deps) => deps.onMultiSelectChange('model_ids', d.model_ids ?? []),
  vehicle_year: (d, deps) => {
    const { yearGte, yearLte } = normalizeYearRangeOrder(d.year_gte ?? '', d.year_lte ?? '');
    deps.onFilterChange('year_gte', yearGte);
    deps.onFilterChange('year_lte', yearLte);
    deps.onYearBlur('year_gte', yearGte);
    deps.onYearBlur('year_lte', yearLte);
  },
  vehicle_fuel: (d, deps) => deps.onMultiSelectChange('fuels', d.fuels ?? []),
  vehicle_body: (d, deps) => deps.onMultiSelectChange('body_types', d.body_types ?? []),
  vehicle_price: (d, deps) => {
    const { priceGte, priceLte } = normalizePriceRangeOrder(d.price_gte ?? '', d.price_lte ?? '');
    deps.onFilterChange('price_gte', priceGte);
    deps.onFilterChange('price_lte', priceLte);
    deps.onPriceBlur('price_gte', priceGte);
    deps.onPriceBlur('price_lte', priceLte);
  },
  vehicle_transmission: (d, deps) =>
    deps.onMultiSelectChange('transmissions', d.transmissions ?? []),
  vehicle_drive: (d, deps) => deps.onMultiSelectChange('drive_types', d.drive_types ?? []),
  vehicle_mileage: (d, deps) => {
    const { mileageGte, mileageLte } = normalizeMileageRangeOrder(
      d.mileage_gte ?? '',
      d.mileage_lte ?? '',
    );
    deps.onFilterChange('mileage_gte', mileageGte);
    deps.onFilterChange('mileage_lte', mileageLte);
    deps.handleMileageBlur('mileage_gte', mileageGte);
    deps.handleMileageBlur('mileage_lte', mileageLte);
  },
  vehicle_city: (d, deps) => deps.onMultiSelectChange('cities', d.cities ?? []),
  vehicle_registration: (d, deps) =>
    deps.onMultiSelectChange('registration_types', d.registration_types ?? []),
  vehicle_condition: (d, deps) => deps.onMultiSelectChange('conditions', d.conditions ?? []),
  vehicle_engine: (d, deps) => {
    const { engineGte, engineLte } = normalizeEngineDisplacementRangeOrder(
      d.engine_displ_l_gte ?? '',
      d.engine_displ_l_lte ?? '',
    );
    deps.onFilterChange('engine_displ_l_gte', engineGte);
    deps.onFilterChange('engine_displ_l_lte', engineLte);
    deps.handleEngineBlur('engine_displ_l_gte', engineGte);
    deps.handleEngineBlur('engine_displ_l_lte', engineLte);
  },
  vehicle_horsepower: (d, deps) => {
    const { horsepowerGte, horsepowerLte } = normalizeHorsepowerRangeOrder(
      d.horsepower_gte ?? '',
      d.horsepower_lte ?? '',
    );
    deps.onFilterChange('horsepower_gte', horsepowerGte);
    deps.onFilterChange('horsepower_lte', horsepowerLte);
    deps.handleHorsepowerBlur('horsepower_gte', horsepowerGte);
    deps.handleHorsepowerBlur('horsepower_lte', horsepowerLte);
  },
  vehicle_color: (d, deps) => deps.onMultiSelectChange('colors', d.colors ?? []),
  vehicle_doors: (d, deps) => deps.onMultiSelectChange('doors', d.doors ?? []),
  vehicle_seller: (d, deps) => deps.onMultiSelectChange('seller_types', d.seller_types ?? []),
};

export function runVehicleSheetConfirm(
  openSheet: string | null,
  mobileDraft: Partial<FilterState> | null,
  deps: VehicleSheetConfirmDeps,
): void {
  if (!openSheet || !mobileDraft) {
    deps.dismissSheet();
    return;
  }
  const fn = VEHICLE_SHEET_CONFIRM[openSheet];
  if (fn) fn(mobileDraft, deps);
  deps.dismissSheet();
}
