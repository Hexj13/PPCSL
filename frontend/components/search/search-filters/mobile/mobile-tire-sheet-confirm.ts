import type { FilterState } from '@/hooks/useSearchFilters';

import { normalizePriceRangeOrder } from './mobile-search-filters-utils';

export type TireSheetConfirmDeps = {
  dismissSheet: () => void;
  onMultiSelectChange: (_key: keyof FilterState, _values: string[]) => void;
  onFilterChange: (_key: keyof FilterState, _value: string) => void;
  onPriceBlur: (_key: string, _value: string) => void;
  updateMultiple: (_updates: Partial<FilterState>) => void;
};

type TireConfirmFn = (d: Partial<FilterState>, deps: TireSheetConfirmDeps) => void;

const TIRE_SHEET_CONFIRM: Record<string, TireConfirmFn> = {
  tire_size: (d, deps) => {
    deps.onMultiSelectChange('tire_widths', d.tire_widths ?? []);
    deps.onMultiSelectChange('tire_profiles', d.tire_profiles ?? []);
    deps.onMultiSelectChange('tire_diameters', d.tire_diameters ?? []);
  },
  tire_price: (d, deps) => {
    const { priceGte, priceLte } = normalizePriceRangeOrder(d.price_gte ?? '', d.price_lte ?? '');
    deps.onFilterChange('price_gte', priceGte);
    deps.onFilterChange('price_lte', priceLte);
    deps.onPriceBlur('price_gte', priceGte);
    deps.onPriceBlur('price_lte', priceLte);
  },
  tire_brand: (d, deps) => deps.onMultiSelectChange('tire_brand_ids', d.tire_brand_ids ?? []),
  tire_model: (d, deps) => deps.onMultiSelectChange('tire_model_ids', d.tire_model_ids ?? []),
  tire_tread: (d, deps) => deps.onMultiSelectChange('tire_seasons', d.tire_seasons ?? []),
  tire_features: (d, deps) =>
    deps.updateMultiple({
      tire_studded: Boolean(d.tire_studded),
      tire_run_flat: Boolean(d.tire_run_flat),
      tire_reinforced_xl: Boolean(d.tire_reinforced_xl),
      tire_spare_donut: Boolean(d.tire_spare_donut),
      tire_tubeless: Boolean(d.tire_tubeless),
      tire_acoustic: Boolean(d.tire_acoustic),
    }),
  tire_city: (d, deps) => deps.onMultiSelectChange('cities', d.cities ?? []),
  tire_condition: (d, deps) => deps.onMultiSelectChange('tire_conditions', d.tire_conditions ?? []),
  tire_quantity: (d, deps) => deps.onMultiSelectChange('tire_quantities', d.tire_quantities ?? []),
  tire_seller: (d, deps) => deps.onMultiSelectChange('seller_types', d.seller_types ?? []),
};

export function runTireSheetConfirm(
  openSheet: string | null,
  mobileDraft: Partial<FilterState> | null,
  deps: TireSheetConfirmDeps,
): void {
  if (!openSheet || !mobileDraft) {
    deps.dismissSheet();
    return;
  }
  const fn = TIRE_SHEET_CONFIRM[openSheet];
  if (fn) fn(mobileDraft, deps);
  deps.dismissSheet();
}
