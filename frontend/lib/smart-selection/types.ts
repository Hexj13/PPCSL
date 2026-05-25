export const SMART_PURPOSES = [
  'city',
  'commute',
  'family',
  'long_trips',
  'travel',
  'first_car',
  'taxi_work',
  'business',
  'active_offroad',
  'comfort',
] as const;

export const SMART_DRIVING_MODES = [
  'city',
  'city_highway',
  'highway',
  'rural_bad_roads',
  'mixed',
] as const;

export const SMART_BUDGET_PRESETS = [
  'up_to_5000',
  'up_to_8000',
  'up_to_12000',
  'up_to_15000',
  'up_to_20000',
  'up_to_30000',
  'up_to_50000',
] as const;

export const SMART_SIZES = ['small', 'medium', 'large', 'any'] as const;

export const SMART_BODY_TYPE_CHOICES = [
  'Hatchback',
  'Sedan',
  'Wagon',
  'SUV',
  'Minivan',
  'Coupe',
  'Convertible',
  'Pickup',
  'auto_pick',
] as const;

export const SMART_TRANSMISSION_CHOICES = [
  'automatic_only',
  'manual_only',
  'any',
  'prefer_automatic',
  'prefer_manual',
] as const;

export const SMART_FUEL_CHOICES = [
  'Petrol',
  'Diesel',
  'Hybrid',
  'Electric',
  'LPG',
  'any',
  'auto_pick',
] as const;

export const SMART_YEAR_PRESETS = [
  'not_older_than_2',
  'not_older_than_3',
  'not_older_than_5',
  'not_older_than_7',
  'not_older_than_10',
  'any',
] as const;

export const SMART_MILEAGE_PRESETS = [
  'up_to_50000',
  'up_to_100000',
  'up_to_150000',
  'up_to_200000',
  'any',
] as const;

export const SMART_PRIORITIES = [
  'low_consumption',
  'reliability',
  'low_maintenance',
  'comfort',
  'safety',
  'luggage',
  'dynamics',
  'looks',
  'fresh_year',
  'low_mileage',
  'resale',
  'equipment',
] as const;

export type SmartPurpose = (typeof SMART_PURPOSES)[number];
export type SmartDrivingMode = (typeof SMART_DRIVING_MODES)[number];
export type SmartBudgetPreset = (typeof SMART_BUDGET_PRESETS)[number];
export type SmartSize = (typeof SMART_SIZES)[number];
export type SmartBodyTypeChoice = (typeof SMART_BODY_TYPE_CHOICES)[number];
export type SmartTransmissionChoice = (typeof SMART_TRANSMISSION_CHOICES)[number];
export type SmartFuelChoice = (typeof SMART_FUEL_CHOICES)[number];
export type SmartYearPreset = (typeof SMART_YEAR_PRESETS)[number];
export type SmartMileagePreset = (typeof SMART_MILEAGE_PRESETS)[number];
export type SmartPriority = (typeof SMART_PRIORITIES)[number];

export type SmartSelectionAnswers = {
  purposes: SmartPurpose[];
  drivingMode: SmartDrivingMode | '';
  budgetPreset: SmartBudgetPreset | '';
  flexibleBudget: boolean;
  size: SmartSize | '';
  bodyTypes: SmartBodyTypeChoice[];
  transmission: SmartTransmissionChoice | '';
  fuels: SmartFuelChoice[];
  yearPreset: SmartYearPreset | '';
  mileagePreset: SmartMileagePreset | '';
  priorities: SmartPriority[];
};

export const INITIAL_SMART_SELECTION_ANSWERS: SmartSelectionAnswers = {
  purposes: [],
  drivingMode: '',
  budgetPreset: '',
  flexibleBudget: false,
  size: '',
  bodyTypes: ['auto_pick'],
  transmission: '',
  fuels: ['auto_pick'],
  yearPreset: '',
  mileagePreset: '',
  priorities: [],
};
