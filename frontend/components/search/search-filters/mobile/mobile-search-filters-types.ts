import type { FilterState } from '@/hooks/useSearchFilters';
import type { Brand, TireBrand, TireModel, VehicleModel } from '@/lib/api';

import type { MultiSelectOption } from './sheets/MultiSelectSheet';

export type MobileSearchFiltersSharedHandlers = {
  onFilterChange: (_key: keyof FilterState, _value: string) => void;
  onMultiSelectChange: (_key: keyof FilterState, _values: string[]) => void;
  onCheckboxChange: (_key: keyof FilterState, _checked: boolean) => void;
  onYearBlur: (_key: string, _value: string) => void;
  onPriceChange: (_key: string, _value: string) => void;
  onPriceBlur: (_key: string, _value: string) => void;
  onWheel: (_e: React.WheelEvent<HTMLInputElement>) => void;
  updateMultiple: (_updates: Partial<FilterState>) => void;
};

export interface MobileSearchFiltersVehicleProps extends MobileSearchFiltersSharedHandlers {
  variant: 'vehicle';
  activeTab: 'basic' | 'advanced' | 'equipment' | 'popular';
  filters: FilterState;
  vehicleType: 'car' | 'truck' | 'moto';
  brandOptions: MultiSelectOption[];
  modelOptions: MultiSelectOption[];
  loadingModels: boolean;
  cityOptions: MultiSelectOption[];
  colorOptions: MultiSelectOption[];
  getConditionOptions: () => MultiSelectOption[];
  getRegistrationTypeOptions: () => MultiSelectOption[];
  brands: Brand[];
  models: VehicleModel[];
  setFilters: (_filters: FilterState | ((_prev: FilterState) => FilterState)) => void;
}

export interface MobileSearchFiltersTireProps extends MobileSearchFiltersSharedHandlers {
  variant: 'tire';
  activeTab: 'basic' | 'popular';
  filters: FilterState;
  tireBrands: TireBrand[];
  tireModels: TireModel[];
  loadingTireModels: boolean;
  cityOptions: MultiSelectOption[];
}

export type MobileSearchFiltersProps =
  | MobileSearchFiltersVehicleProps
  | MobileSearchFiltersTireProps;
