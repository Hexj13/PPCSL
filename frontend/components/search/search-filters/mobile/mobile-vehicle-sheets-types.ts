import type { FilterState } from '@/hooks/useSearchFilters';

import type { MobileTranslateFn } from './mobile-search-filters-utils';
import type { MultiSelectOption } from './sheets/MultiSelectSheet';

export type MobileVehicleSheetsProps = {
  openSheet: string | null;
  dismissSheet: () => void;
  confirmVehicleSheet: () => void;
  mobileDraft: Partial<FilterState> | null;
  filters: FilterState;
  patchMobileDraft: (_patch: Partial<FilterState>) => void;
  draftPriceChange: (_key: 'price_gte' | 'price_lte', _value: string) => void;
  t: MobileTranslateFn;
  brandOptions: MultiSelectOption[];
  modelOptions: MultiSelectOption[];
  yearOptions: MultiSelectOption[];
  fuelOptions: MultiSelectOption[];
  bodyTypeOptions: MultiSelectOption[];
  transmissionOptions: MultiSelectOption[];
  driveTypeOptions: MultiSelectOption[];
  cityOptions: MultiSelectOption[];
  doorOptions: MultiSelectOption[];
  colorOptions: MultiSelectOption[];
  sellerTypeOptions: MultiSelectOption[];
  getRegistrationTypeOptions: () => MultiSelectOption[];
  getConditionOptions: () => MultiSelectOption[];
};
