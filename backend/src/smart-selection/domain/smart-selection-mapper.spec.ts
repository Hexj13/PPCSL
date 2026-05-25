import {
  mapSmartSelectionToSavedFilter,
  resolveSmartFilterNameKey,
} from './smart-selection-mapper';
import type { SmartSelectionAnswers } from './smart-selection.types';

function baseAnswers(overrides: Partial<SmartSelectionAnswers> = {}): SmartSelectionAnswers {
  return {
    purposes: ['city', 'commute'],
    drivingMode: 'mixed',
    budgetPreset: 'up_to_15000',
    currency: 'EUR',
    flexibleBudget: false,
    size: 'medium',
    bodyTypes: ['auto_pick'],
    transmission: 'prefer_automatic',
    fuels: ['auto_pick'],
    yearPreset: 'not_older_than_5',
    mileagePreset: 'up_to_150000',
    priorities: ['reliability', 'low_consumption'],
    ...overrides,
  };
}

describe('smart-selection-mapper', () => {
  it('maps city commute answers to car search filters', () => {
    const filters = mapSmartSelectionToSavedFilter(baseAnswers());

    expect(filters.vehicleType).toBe('car');
    expect(filters.currency).toBe('EUR');
    expect(filters.price_lte).toBe('15000');
    expect(filters.year_gte).toBe(String(new Date().getFullYear() - 5));
    expect(filters.mileage_lte).toBe('150000');
    expect(Array.isArray(filters.body_types)).toBe(true);
    expect((filters.body_types as string[]).length).toBeGreaterThan(0);
    expect(filters.transmissions).toEqual(['Automatic', 'CVT', 'Robot']);
  });

  it('sets AWD for rural bad roads', () => {
    const filters = mapSmartSelectionToSavedFilter(
      baseAnswers({
        drivingMode: 'rural_bad_roads',
        purposes: ['active_offroad'],
      }),
    );

    expect(filters.drive_types).toEqual(['AWD']);
  });

  it('uses only automatic transmissions when automatic_only', () => {
    const filters = mapSmartSelectionToSavedFilter(baseAnswers({ transmission: 'automatic_only' }));

    expect(filters.transmissions).toEqual(['Automatic', 'CVT', 'Robot']);
  });

  it('preserves explicit body type choices even when they do not match inferred defaults', () => {
    const filters = mapSmartSelectionToSavedFilter(
      baseAnswers({
        purposes: ['family'],
        drivingMode: 'city',
        size: 'large',
        bodyTypes: ['Coupe'],
      }),
    );

    expect(filters.body_types).toEqual(['Coupe']);
  });

  it('resolves family filter name key', () => {
    const key = resolveSmartFilterNameKey(baseAnswers({ purposes: ['family'] }));
    expect(key).toBe('smartSelection.filterNames.family');
  });
});
