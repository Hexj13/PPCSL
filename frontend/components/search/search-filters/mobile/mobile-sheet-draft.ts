import type { FilterState } from '@/hooks/useSearchFilters';

import { defaultYearLte } from './mobile-search-filters-utils';

type DraftFn = (f: FilterState) => Partial<FilterState>;

const MOBILE_SHEET_DRAFT: Record<string, DraftFn> = {
  vehicle_brand: (f) => ({ brand_ids: [...f.brand_ids] }),
  vehicle_model: (f) => ({ model_ids: [...f.model_ids] }),
  vehicle_year: (f) => ({
    year_gte: f.year_gte ?? '',
    year_lte: defaultYearLte(f.year_lte),
  }),
  vehicle_fuel: (f) => ({ fuels: [...f.fuels] }),
  vehicle_body: (f) => ({ body_types: [...f.body_types] }),
  vehicle_price: (f) => ({ price_gte: f.price_gte, price_lte: f.price_lte }),
  vehicle_transmission: (f) => ({ transmissions: [...f.transmissions] }),
  vehicle_drive: (f) => ({ drive_types: [...f.drive_types] }),
  vehicle_mileage: (f) => ({ mileage_gte: f.mileage_gte, mileage_lte: f.mileage_lte }),
  vehicle_city: (f) => ({ cities: [...f.cities] }),
  vehicle_registration: (f) => ({ registration_types: [...f.registration_types] }),
  vehicle_condition: (f) => ({ conditions: [...f.conditions] }),
  vehicle_engine: (f) => ({
    engine_displ_l_gte: f.engine_displ_l_gte,
    engine_displ_l_lte: f.engine_displ_l_lte,
  }),
  vehicle_horsepower: (f) => ({
    horsepower_gte: f.horsepower_gte,
    horsepower_lte: f.horsepower_lte,
  }),
  vehicle_color: (f) => ({ colors: [...f.colors] }),
  vehicle_doors: (f) => ({ doors: [...f.doors] }),
  vehicle_seller: (f) => ({ seller_type: f.seller_type }),
  tire_size: (f) => ({
    tire_widths: [...f.tire_widths],
    tire_profiles: [...f.tire_profiles],
    tire_diameters: [...f.tire_diameters],
  }),
  tire_price: (f) => ({ price_gte: f.price_gte, price_lte: f.price_lte }),
  tire_brand: (f) => ({ tire_brand_ids: [...f.tire_brand_ids] }),
  tire_model: (f) => ({ tire_model_ids: [...f.tire_model_ids] }),
  tire_tread: (f) => ({ tire_seasons: [...f.tire_seasons] }),
  tire_features: (f) => ({
    tire_studded: f.tire_studded,
    tire_run_flat: f.tire_run_flat,
    tire_reinforced_xl: f.tire_reinforced_xl,
    tire_spare_donut: f.tire_spare_donut,
    tire_tubeless: f.tire_tubeless,
    tire_acoustic: f.tire_acoustic,
  }),
  tire_city: (f) => ({ cities: [...f.cities] }),
  tire_condition: (f) => ({ tire_conditions: [...f.tire_conditions] }),
  tire_quantity: (f) => ({ tire_quantities: [...f.tire_quantities] }),
  tire_seller: (f) => ({ seller_type: f.seller_type }),
};

export function createMobileSheetDraft(sheet: string, f: FilterState): Partial<FilterState> {
  const fn = MOBILE_SHEET_DRAFT[sheet];
  return fn ? fn(f) : {};
}
