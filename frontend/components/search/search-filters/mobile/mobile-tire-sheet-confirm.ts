import type { FilterState } from '@/hooks/useSearchFilters';

import { normalizePriceRangeOrder } from './mobile-search-filters-utils';

export type TireSheetConfirmDeps = {
  dismissSheet: () => void;
  onMultiSelectChange: (_key: keyof FilterState, _values: string[]) => void;
  onFilterChange: (_key: keyof FilterState, _value: string) => void;
  onPriceBlur: (_key: string, _value: string) => void;
  updateMultiple: (_updates: Partial<FilterState>) => void;
};

type TireConfirmFn = (d: Partial<FilterState>, deps: TireSheetConfirmDeps) => Partial<FilterState>;

const TIRE_SHEET_CONFIRM: Record<string, TireConfirmFn> = {
  tire_size: (d, deps) => {
    const patch = {
      tire_widths: d.tire_widths ?? [],
      tire_profiles: d.tire_profiles ?? [],
      tire_diameters: d.tire_diameters ?? [],
    };
    deps.onMultiSelectChange('tire_widths', patch.tire_widths);
    deps.onMultiSelectChange('tire_profiles', patch.tire_profiles);
    deps.onMultiSelectChange('tire_diameters', patch.tire_diameters);
    return patch;
  },
  tire_price: (d, deps) => {
    const { priceGte, priceLte } = normalizePriceRangeOrder(d.price_gte ?? '', d.price_lte ?? '');
    deps.onFilterChange('price_gte', priceGte);
    deps.onFilterChange('price_lte', priceLte);
    deps.onPriceBlur('price_gte', priceGte);
    deps.onPriceBlur('price_lte', priceLte);
    return { price_gte: priceGte, price_lte: priceLte };
  },
  tire_brand: (d, deps) => {
    const tire_brand_ids = d.tire_brand_ids ?? [];
    deps.onMultiSelectChange('tire_brand_ids', tire_brand_ids);
    return { tire_brand_ids };
  },
  tire_model: (d, deps) => {
    const tire_model_ids = d.tire_model_ids ?? [];
    deps.onMultiSelectChange('tire_model_ids', tire_model_ids);
    return { tire_model_ids };
  },
  tire_tread: (d, deps) => {
    const tire_seasons = d.tire_seasons ?? [];
    deps.onMultiSelectChange('tire_seasons', tire_seasons);
    return { tire_seasons };
  },
  tire_features: (d, deps) => {
    const patch = {
      tire_studded: Boolean(d.tire_studded),
      tire_run_flat: Boolean(d.tire_run_flat),
      tire_reinforced_xl: Boolean(d.tire_reinforced_xl),
      tire_spare_donut: Boolean(d.tire_spare_donut),
      tire_tubeless: Boolean(d.tire_tubeless),
      tire_acoustic: Boolean(d.tire_acoustic),
    };
    deps.updateMultiple(patch);
    return patch;
  },
  tire_city: (d, deps) => {
    const cities = d.cities ?? [];
    deps.onMultiSelectChange('cities', cities);
    return { cities };
  },
  tire_condition: (d, deps) => {
    const tire_conditions = d.tire_conditions ?? [];
    deps.onMultiSelectChange('tire_conditions', tire_conditions);
    return { tire_conditions };
  },
  tire_quantity: (d, deps) => {
    const tire_quantities = d.tire_quantities ?? [];
    deps.onMultiSelectChange('tire_quantities', tire_quantities);
    return { tire_quantities };
  },
  tire_seller: (d, deps) => {
    const seller_types = d.seller_types ?? [];
    deps.onMultiSelectChange('seller_types', seller_types);
    return { seller_types };
  },
};

export function runTireSheetConfirm(
  openSheet: string | null,
  mobileDraft: Partial<FilterState> | null,
  deps: TireSheetConfirmDeps,
): Partial<FilterState> {
  if (!openSheet || !mobileDraft) {
    deps.dismissSheet();
    return {};
  }
  const fn = TIRE_SHEET_CONFIRM[openSheet];
  const patch = fn ? fn(mobileDraft, deps) : {};
  deps.dismissSheet();
  return patch;
}
