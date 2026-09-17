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

type ConfirmFn = (d: Partial<FilterState>, deps: VehicleSheetConfirmDeps) => Partial<FilterState>;

const VEHICLE_SHEET_CONFIRM: Record<string, ConfirmFn> = {
  vehicle_brand: (d, deps) => {
    const brand_ids = d.brand_ids ?? [];
    deps.onMultiSelectChange('brand_ids', brand_ids);
    return { brand_ids };
  },
  vehicle_model: (d, deps) => {
    const model_ids = d.model_ids ?? [];
    deps.onMultiSelectChange('model_ids', model_ids);
    return { model_ids };
  },
  vehicle_year: (d, deps) => {
    const { yearGte, yearLte } = normalizeYearRangeOrder(d.year_gte ?? '', d.year_lte ?? '');
    deps.onFilterChange('year_gte', yearGte);
    deps.onFilterChange('year_lte', yearLte);
    deps.onYearBlur('year_gte', yearGte);
    deps.onYearBlur('year_lte', yearLte);
    return { year_gte: yearGte, year_lte: yearLte };
  },
  vehicle_fuel: (d, deps) => {
    const fuels = d.fuels ?? [];
    deps.onMultiSelectChange('fuels', fuels);
    return { fuels };
  },
  vehicle_body: (d, deps) => {
    const body_types = d.body_types ?? [];
    deps.onMultiSelectChange('body_types', body_types);
    return { body_types };
  },
  vehicle_price: (d, deps) => {
    const { priceGte, priceLte } = normalizePriceRangeOrder(d.price_gte ?? '', d.price_lte ?? '');
    deps.onFilterChange('price_gte', priceGte);
    deps.onFilterChange('price_lte', priceLte);
    deps.onPriceBlur('price_gte', priceGte);
    deps.onPriceBlur('price_lte', priceLte);
    return { price_gte: priceGte, price_lte: priceLte };
  },
  vehicle_transmission: (d, deps) => {
    const transmissions = d.transmissions ?? [];
    deps.onMultiSelectChange('transmissions', transmissions);
    return { transmissions };
  },
  vehicle_drive: (d, deps) => {
    const drive_types = d.drive_types ?? [];
    deps.onMultiSelectChange('drive_types', drive_types);
    return { drive_types };
  },
  vehicle_mileage: (d, deps) => {
    const { mileageGte, mileageLte } = normalizeMileageRangeOrder(
      d.mileage_gte ?? '',
      d.mileage_lte ?? '',
    );
    deps.onFilterChange('mileage_gte', mileageGte);
    deps.onFilterChange('mileage_lte', mileageLte);
    deps.handleMileageBlur('mileage_gte', mileageGte);
    deps.handleMileageBlur('mileage_lte', mileageLte);
    return { mileage_gte: mileageGte, mileage_lte: mileageLte };
  },
  vehicle_city: (d, deps) => {
    const cities = d.cities ?? [];
    deps.onMultiSelectChange('cities', cities);
    return { cities };
  },
  vehicle_registration: (d, deps) => {
    const registration_types = d.registration_types ?? [];
    deps.onMultiSelectChange('registration_types', registration_types);
    return { registration_types };
  },
  vehicle_condition: (d, deps) => {
    const conditions = d.conditions ?? [];
    deps.onMultiSelectChange('conditions', conditions);
    return { conditions };
  },
  vehicle_engine: (d, deps) => {
    const { engineGte, engineLte } = normalizeEngineDisplacementRangeOrder(
      d.engine_displ_l_gte ?? '',
      d.engine_displ_l_lte ?? '',
    );
    deps.onFilterChange('engine_displ_l_gte', engineGte);
    deps.onFilterChange('engine_displ_l_lte', engineLte);
    deps.handleEngineBlur('engine_displ_l_gte', engineGte);
    deps.handleEngineBlur('engine_displ_l_lte', engineLte);
    return { engine_displ_l_gte: engineGte, engine_displ_l_lte: engineLte };
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
    return { horsepower_gte: horsepowerGte, horsepower_lte: horsepowerLte };
  },
  vehicle_color: (d, deps) => {
    const colors = d.colors ?? [];
    deps.onMultiSelectChange('colors', colors);
    return { colors };
  },
  vehicle_doors: (d, deps) => {
    const doors = d.doors ?? [];
    deps.onMultiSelectChange('doors', doors);
    return { doors };
  },
  vehicle_seller: (d, deps) => {
    const seller_types = d.seller_types ?? [];
    deps.onMultiSelectChange('seller_types', seller_types);
    return { seller_types };
  },
};

export function runVehicleSheetConfirm(
  openSheet: string | null,
  mobileDraft: Partial<FilterState> | null,
  deps: VehicleSheetConfirmDeps,
): Partial<FilterState> {
  if (!openSheet || !mobileDraft) {
    deps.dismissSheet();
    return {};
  }
  const fn = VEHICLE_SHEET_CONFIRM[openSheet];
  const patch = fn ? fn(mobileDraft, deps) : {};
  deps.dismissSheet();
  return patch;
}
