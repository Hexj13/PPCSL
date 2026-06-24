import {
  expandFilterUntilEnoughResults,
  savedFilterToSearchCriteria,
} from './smart-selection-filter-expander';
import type { SmartSelectionAnswers } from './smart-selection.types';

const ALL_CAR_BODY_TYPES = [
  'Hatchback',
  'Sedan',
  'Wagon',
  'SUV',
  'Coupe',
  'Convertible',
  'Minivan',
  'Pickup',
];
const ALL_CAR_FUELS = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'LPG', 'MHEV', 'PHEV'];

function baseAnswers(): SmartSelectionAnswers {
  return {
    purposes: ['city'],
    drivingMode: 'city',
    budgetPreset: 'up_to_15000',
    currency: 'EUR',
    flexibleBudget: true,
    size: 'small',
    bodyTypes: ['Hatchback'],
    transmission: 'prefer_automatic',
    fuels: ['Petrol'],
    yearPreset: 'not_older_than_5',
    mileagePreset: 'up_to_100000',
    priorities: ['reliability'],
  };
}

describe('smart-selection-filter-expander', () => {
  it('converts saved filter record to search criteria', () => {
    const criteria = savedFilterToSearchCriteria({
      vehicleType: 'car',
      price_lte: '15000',
      year_gte: '2017',
      body_types: ['Hatchback', 'Sedan'],
      fuels: ['Petrol'],
    });

    expect(criteria.vehicleType).toBe('car');
    expect(criteria.price_lte).toBe(15000);
    expect(criteria.year_gte).toBe(2017);
    expect(criteria.body_types).toEqual(['Hatchback', 'Sedan']);
  });

  it('keeps explicit body type and fuel choices when count is below minimum', async () => {
    let callCount = 0;
    const initial = {
      vehicleType: 'car',
      price_lte: '15000',
      body_types: ['Hatchback'],
      fuels: ['Petrol'],
      equipment: ['abs'],
      equipment_match_mode: 'full',
      drive_types: ['AWD'],
      year_gte: '2019',
      mileage_lte: '100000',
      transmissions: ['Automatic'],
    };

    const result = await expandFilterUntilEnoughResults(
      initial,
      baseAnswers(),
      async () => {
        callCount += 1;
        return callCount >= 7 ? 6 : 1;
      },
      5,
    );

    expect(callCount).toBeGreaterThanOrEqual(4);
    expect(result.body_types).toEqual(['Hatchback']);
    expect(result.fuels).toEqual(['Petrol']);
  });

  it('expands body types and fuels for automatic choices', async () => {
    let callCount = 0;
    const initial = {
      vehicleType: 'car',
      price_lte: '15000',
      body_types: ['Hatchback', 'Sedan'],
      fuels: ['Petrol', 'Hybrid'],
      equipment: ['abs'],
      equipment_match_mode: 'full',
      drive_types: ['AWD'],
      year_gte: '2019',
      mileage_lte: '100000',
      transmissions: ['Automatic'],
    };

    const result = await expandFilterUntilEnoughResults(
      initial,
      {
        ...baseAnswers(),
        bodyTypes: ['auto_pick'],
        fuels: ['auto_pick'],
      },
      async () => {
        callCount += 1;
        return callCount >= 8 ? 6 : 1;
      },
      5,
    );

    expect(result.body_types).toEqual(ALL_CAR_BODY_TYPES);
    expect(result.fuels).toEqual(ALL_CAR_FUELS);
  });

  it('keeps explicit fuel choices while expanding automatic body types', async () => {
    let callCount = 0;
    const initial = {
      vehicleType: 'car',
      price_lte: '15000',
      body_types: ['Hatchback', 'Sedan'],
      fuels: ['Diesel'],
      equipment: ['abs'],
      equipment_match_mode: 'full',
      drive_types: ['AWD'],
      year_gte: '2019',
      mileage_lte: '100000',
      transmissions: ['Automatic'],
    };

    const result = await expandFilterUntilEnoughResults(
      initial,
      {
        ...baseAnswers(),
        bodyTypes: ['auto_pick'],
        fuels: ['Diesel'],
      },
      async () => {
        callCount += 1;
        return callCount >= 7 ? 6 : 1;
      },
      5,
    );

    expect(result.body_types).toEqual(ALL_CAR_BODY_TYPES);
    expect(result.fuels).toEqual(['Diesel']);
  });
});
