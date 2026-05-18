import type { FilterState } from './useSearchFilters';

function hasVehicleBasicFilters(filters: FilterState, currentYear: string): boolean {
  const hasBrandOrModel = filters.brand_ids.length > 0 || filters.model_ids.length > 0;
  return (
    hasBrandOrModel ||
    filters.transmissions.length > 0 ||
    filters.drive_types.length > 0 ||
    filters.mileage_gte !== '' ||
    filters.mileage_lte !== '' ||
    filters.fuels.length > 0 ||
    filters.body_types.length > 0 ||
    filters.year_gte !== '' ||
    filters.year_lte !== currentYear ||
    filters.price_gte !== '' ||
    filters.price_lte !== ''
  );
}

function hasVehicleAdvancedFiltersActive(filters: FilterState): boolean {
  return (
    filters.cities.length > 0 ||
    filters.currency !== '' ||
    filters.urgent === true ||
    filters.is_new === true ||
    filters.available_in_credit === true ||
    filters.down_payment_amount_gte !== '' ||
    filters.engine_displ_l_gte !== '' ||
    filters.engine_displ_l_lte !== '' ||
    filters.horsepower_gte !== '' ||
    filters.horsepower_lte !== '' ||
    filters.colors.length > 0 ||
    filters.doors.length > 0 ||
    filters.conditions.length > 0 ||
    filters.registration_types.length > 0 ||
    filters.seller_type !== ''
  );
}

export function computeVehicleSearchFilterFlags(
  filters: FilterState,
  currentYear: string,
): {
  hasBasicFilters: boolean;
  hasAdvancedFiltersActive: boolean;
  hasEquipmentFiltersActive: boolean;
} {
  return {
    hasBasicFilters: hasVehicleBasicFilters(filters, currentYear),
    hasAdvancedFiltersActive: hasVehicleAdvancedFiltersActive(filters),
    hasEquipmentFiltersActive: filters.equipment.length > 0,
  };
}
