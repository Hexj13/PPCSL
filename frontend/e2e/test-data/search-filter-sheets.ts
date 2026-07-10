import type {
  SearchFilterTab,
  VehicleSheetCase,
} from '../components/search/search-filters-mobile.component';

export type { SearchFilterTab };

export const VEHICLE_SEARCH_TABS: readonly SearchFilterTab[] = [
  'popular',
  'basic',
  'advanced',
  'equipment',
];

export const VEHICLE_BASIC_SHEETS: VehicleSheetCase[] = [
  { tab: 'basic', sheetId: 'vehicle_brand', kind: 'multi' },
  { tab: 'basic', sheetId: 'vehicle_model', kind: 'multi' },
  { tab: 'basic', sheetId: 'vehicle_fuel', kind: 'multi', optionValue: 'Petrol' },
  { tab: 'basic', sheetId: 'vehicle_body', kind: 'multi', optionValue: 'Sedan' },
  { tab: 'basic', sheetId: 'vehicle_year', kind: 'range-select' },
  { tab: 'basic', sheetId: 'vehicle_price', kind: 'range-wheel', wheelValue: '5000' },
  { tab: 'basic', sheetId: 'vehicle_transmission', kind: 'multi', optionValue: 'Automatic' },
  { tab: 'basic', sheetId: 'vehicle_drive', kind: 'multi', optionValue: 'FWD' },
  { tab: 'basic', sheetId: 'vehicle_mileage', kind: 'range-wheel', wheelValue: '50000' },
];

export const VEHICLE_ADVANCED_SHEETS: VehicleSheetCase[] = [
  { tab: 'advanced', sheetId: 'vehicle_city', kind: 'multi' },
  { tab: 'advanced', sheetId: 'vehicle_registration', kind: 'multi', optionValue: 'Local' },
  { tab: 'advanced', sheetId: 'vehicle_condition', kind: 'multi', optionValue: 'Undamaged' },
  { tab: 'advanced', sheetId: 'vehicle_engine', kind: 'range-wheel', wheelValue: '1.6' },
  { tab: 'advanced', sheetId: 'vehicle_horsepower', kind: 'range-wheel', wheelValue: '120' },
  { tab: 'advanced', sheetId: 'vehicle_color', kind: 'multi' },
  { tab: 'advanced', sheetId: 'vehicle_doors', kind: 'multi', optionValue: '4' },
  { tab: 'advanced', sheetId: 'vehicle_seller', kind: 'single', optionValue: 'Individual' },
];
