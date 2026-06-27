import type { FilterState } from '@/hooks/useSearchFilters';

import type { MobileTranslateFn } from './mobile-search-filters-utils';
import type { MultiSelectOption } from './sheets/MultiSelectSheet';

export type TireFeatureMulti = {
  options: MultiSelectOption[];
  values: string[];
};

export type MobileTireSheetsProps = {
  openSheet: string | null;
  dismissSheet: () => void;
  confirmTireSheet: () => void;
  mobileDraft: Partial<FilterState> | null;
  filters: FilterState;
  patchMobileDraft: (_patch: Partial<FilterState>) => void;
  setDraftTireDimension: (
    _key: 'tire_widths' | 'tire_profiles' | 'tire_diameters',
    _raw: string,
  ) => void;
  t: MobileTranslateFn;
  rangeAnyLabel: string;
  priceOptions: MultiSelectOption[];
  tireWidthOptions: MultiSelectOption[];
  tireProfileOptions: MultiSelectOption[];
  tireDiameterOptions: MultiSelectOption[];
  tireBrandOptions: MultiSelectOption[];
  tireModelOptions: MultiSelectOption[];
  treadOptions: MultiSelectOption[];
  tireFeatureMulti: TireFeatureMulti;
  conditionOptions: MultiSelectOption[];
  cityOptions: MultiSelectOption[];
  sellerTypeOptions: MultiSelectOption[];
};
