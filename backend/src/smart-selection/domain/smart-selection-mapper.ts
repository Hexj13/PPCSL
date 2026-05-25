import type {
  SavedFilterRecord,
  SmartMileagePreset,
  SmartSelectionAnswers,
  SmartTransmissionChoice,
  SmartYearPreset,
} from './smart-selection.types';

const BUDGET_TO_PRICE: Record<string, number> = {
  up_to_5000: 5000,
  up_to_8000: 8000,
  up_to_12000: 12000,
  up_to_15000: 15000,
  up_to_20000: 20000,
  up_to_30000: 30000,
  up_to_50000: 50000,
};

const YEAR_PRESET_MAX_AGE: Record<Exclude<SmartYearPreset, 'any'>, number> = {
  not_older_than_2: 2,
  not_older_than_3: 3,
  not_older_than_5: 5,
  not_older_than_7: 7,
  not_older_than_10: 10,
};

function yearGteFromPreset(preset: SmartYearPreset): string | undefined {
  if (preset === 'any') {
    return undefined;
  }
  const currentYear = new Date().getFullYear();
  return String(currentYear - YEAR_PRESET_MAX_AGE[preset]);
}

const MILEAGE_PRESET_TO_LTE: Record<SmartMileagePreset, string | undefined> = {
  up_to_50000: '50000',
  up_to_100000: '100000',
  up_to_150000: '150000',
  up_to_200000: '200000',
  any: undefined,
};

const AUTO_TRANSMISSIONS = ['Automatic', 'CVT', 'Robot'] as const;
const MANUAL_TRANSMISSIONS = ['Manual'] as const;

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function bodyTypesFromAnswers(answers: SmartSelectionAnswers): string[] {
  const fromPurposes: string[] = [];
  const purposeSet = new Set(answers.purposes);

  if (purposeSet.has('city') || purposeSet.has('commute') || purposeSet.has('first_car')) {
    fromPurposes.push('Hatchback', 'Sedan');
  }
  if (purposeSet.has('family') || purposeSet.has('long_trips') || purposeSet.has('travel')) {
    fromPurposes.push('Wagon', 'SUV', 'Minivan');
  }
  if (purposeSet.has('business') || purposeSet.has('comfort')) {
    fromPurposes.push('Sedan', 'SUV', 'Wagon');
  }
  if (purposeSet.has('active_offroad')) {
    fromPurposes.push('SUV', 'Pickup');
  }
  if (purposeSet.has('taxi_work')) {
    fromPurposes.push('Sedan', 'Minivan', 'Wagon');
  }

  const fromDriving: string[] = [];
  if (answers.drivingMode === 'city') {
    fromDriving.push('Hatchback', 'Sedan');
  } else if (answers.drivingMode === 'highway') {
    fromDriving.push('Sedan', 'Wagon');
  } else if (answers.drivingMode === 'rural_bad_roads') {
    fromDriving.push('SUV', 'Pickup', 'Wagon');
  } else {
    fromDriving.push('Hatchback', 'Sedan', 'Wagon', 'SUV');
  }

  const fromSize: string[] = [];
  if (answers.size === 'small') {
    fromSize.push('Hatchback', 'Sedan');
  } else if (answers.size === 'medium') {
    fromSize.push('Sedan', 'Wagon', 'SUV');
  } else if (answers.size === 'large') {
    fromSize.push('SUV', 'Minivan', 'Wagon');
  }

  let merged = unique([...fromPurposes, ...fromDriving, ...fromSize]);
  if (merged.length === 0) {
    merged = ['Hatchback', 'Sedan', 'Wagon', 'SUV'];
  }

  const userBody = answers.bodyTypes.filter((b) => b !== 'auto_pick') as string[];
  if (userBody.length > 0) {
    return unique(userBody);
  }

  if (answers.priorities.includes('luggage')) {
    merged = unique([...merged, 'Wagon', 'SUV', 'Minivan']);
  }

  return merged;
}

function fuelsFromAnswers(answers: SmartSelectionAnswers): string[] | undefined {
  const userFuels = answers.fuels.filter((f) => f !== 'any' && f !== 'auto_pick') as string[];
  if (userFuels.length > 0) {
    return userFuels;
  }

  const fuels: string[] = [];
  const purposeSet = new Set(answers.purposes);

  if (answers.drivingMode === 'city' || answers.drivingMode === 'mixed') {
    fuels.push('Petrol', 'Hybrid', 'Electric');
  }
  if (answers.drivingMode === 'highway' || answers.drivingMode === 'city_highway') {
    fuels.push('Diesel', 'Petrol', 'Hybrid');
  }
  if (answers.drivingMode === 'rural_bad_roads') {
    fuels.push('Diesel', 'Petrol');
  }
  if (purposeSet.has('city') || purposeSet.has('commute') || purposeSet.has('first_car')) {
    fuels.push('Petrol', 'Hybrid', 'LPG');
  }
  if (purposeSet.has('taxi_work')) {
    fuels.push('Hybrid', 'LPG', 'Diesel');
  }
  if (
    answers.priorities.includes('low_consumption') ||
    answers.priorities.includes('low_maintenance')
  ) {
    fuels.push('Diesel', 'Hybrid', 'LPG', 'Petrol');
  }
  if (answers.priorities.includes('comfort')) {
    fuels.push('Petrol', 'Hybrid', 'Diesel');
  }

  const result = unique(fuels);
  return result.length > 0 ? result : undefined;
}

function transmissionsFromAnswers(choice: SmartTransmissionChoice): string[] | undefined {
  if (choice === 'any') return undefined;
  if (choice === 'automatic_only' || choice === 'prefer_automatic') {
    return [...AUTO_TRANSMISSIONS];
  }
  if (choice === 'manual_only' || choice === 'prefer_manual') {
    return [...MANUAL_TRANSMISSIONS];
  }
  return undefined;
}

function driveTypesFromAnswers(answers: SmartSelectionAnswers): string[] | undefined {
  if (answers.drivingMode === 'rural_bad_roads' || answers.purposes.includes('active_offroad')) {
    return ['AWD'];
  }
  return undefined;
}

function equipmentFromAnswers(answers: SmartSelectionAnswers): string[] | undefined {
  const equipment: string[] = [];
  const prioritySet = new Set(answers.priorities);
  const purposeSet = new Set(answers.purposes);

  if (prioritySet.has('comfort')) {
    equipment.push('climate_control', 'cruise_control', 'heated_seats');
  }
  if (prioritySet.has('safety')) {
    equipment.push('abs', 'esp', 'driver_airbag', 'passenger_airbag');
  }
  if (purposeSet.has('family')) {
    equipment.push('isofix', 'rear_camera', 'parking_sensors');
  }
  if (prioritySet.has('equipment')) {
    equipment.push(
      'climate_control',
      'apple_carplay',
      'android_auto',
      'rear_camera',
      'parking_sensors',
    );
  }
  if (prioritySet.has('looks')) {
    equipment.push('alloy_wheels', 'led_lights');
  }
  if (purposeSet.has('long_trips') || purposeSet.has('travel')) {
    equipment.push('cruise_control');
  }

  const result = unique(equipment);
  return result.length > 0 ? result : undefined;
}

function yearGteFromAnswers(answers: SmartSelectionAnswers): string | undefined {
  let year = yearGteFromPreset(answers.yearPreset);
  if (answers.priorities.includes('fresh_year')) {
    const currentYear = new Date().getFullYear();
    const freshYear = String(Math.max(currentYear - 5, 2015));
    if (!year || Number(year) < Number(freshYear)) {
      year = freshYear;
    }
  }
  if (
    answers.priorities.includes('reliability') ||
    answers.priorities.includes('low_maintenance')
  ) {
    const reliableYear = String(Math.max(new Date().getFullYear() - 10, 2012));
    if (!year || Number(year) < Number(reliableYear)) {
      year = reliableYear;
    }
  }
  return year;
}

function mileageLteFromAnswers(answers: SmartSelectionAnswers): string | undefined {
  let mileage = MILEAGE_PRESET_TO_LTE[answers.mileagePreset];
  if (answers.priorities.includes('low_mileage')) {
    const strict = '120000';
    if (!mileage || Number(mileage) > Number(strict)) {
      mileage = strict;
    }
  }
  if (
    answers.priorities.includes('reliability') ||
    answers.priorities.includes('low_maintenance')
  ) {
    const reliable = '180000';
    if (!mileage || Number(mileage) > Number(reliable)) {
      mileage = reliable;
    }
  }
  return mileage;
}

export function mapSmartSelectionToSavedFilter(answers: SmartSelectionAnswers): SavedFilterRecord {
  const filters: SavedFilterRecord = {
    vehicleType: 'car',
    currency: answers.currency,
  };

  const priceTo = BUDGET_TO_PRICE[answers.budgetPreset];
  if (priceTo) {
    filters.price_lte = String(priceTo);
  }

  const bodyTypes = bodyTypesFromAnswers(answers);
  if (bodyTypes.length > 0) {
    filters.body_types = bodyTypes;
  }

  const fuels = fuelsFromAnswers(answers);
  if (fuels && fuels.length > 0) {
    filters.fuels = fuels;
  }

  const transmissions = transmissionsFromAnswers(answers.transmission);
  if (transmissions && transmissions.length > 0) {
    filters.transmissions = transmissions;
  }

  const driveTypes = driveTypesFromAnswers(answers);
  if (driveTypes && driveTypes.length > 0) {
    filters.drive_types = driveTypes;
  }

  const yearGte = yearGteFromAnswers(answers);
  if (yearGte) {
    filters.year_gte = yearGte;
  }

  const mileageLte = mileageLteFromAnswers(answers);
  if (mileageLte) {
    filters.mileage_lte = mileageLte;
  }

  const equipment = equipmentFromAnswers(answers);
  if (equipment && equipment.length > 0) {
    filters.equipment = equipment;
  }

  return filters;
}

export function resolveSmartFilterNameKey(answers: SmartSelectionAnswers): string {
  if (answers.purposes.includes('family')) {
    return 'smartSelection.filterNames.family';
  }
  if (answers.purposes.includes('city') || answers.purposes.includes('commute')) {
    return 'smartSelection.filterNames.city';
  }
  if (answers.purposes.includes('comfort')) {
    return 'smartSelection.filterNames.comfort';
  }
  return 'smartSelection.filterNames.practical';
}
