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
  t: MobileTranslateFn;
  rangeAnyLabel: string;
  brandOptions: MultiSelectOption[];
  modelOptions: MultiSelectOption[];
  yearOptions: MultiSelectOption[];
  priceOptions: MultiSelectOption[];
  mileageOptions: MultiSelectOption[];
  engineOptions: MultiSelectOption[];
  powerOptions: MultiSelectOption[];
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
