import type { Listing } from '@/lib/api';

import {
  getApplicableEquipmentKeysUnion,
  getEquipmentCompareCellLabel,
  getEquipmentCompareCellState,
  getSelectedEquipmentKeysUnion,
  getVehicleEquipmentComparisonFieldsForListings,
  hasVehicleEquipmentToCompare,
} from './comparisonFields';

const mockT = (key: string): string => {
  const translations: Record<string, string> = {
    'common.yes': 'Yes',
    'common.rangeDash': '—',
    'compare.notAvailable': 'N/A',
    'vehicleOptions.equipment.abs': 'ABS',
    'vehicleOptions.equipment.air_conditioning': 'Air conditioning',
    'vehicleOptions.equipment.navigation': 'Navigation',
    'vehicleOptions.equipment.panoramic_roof': 'Panoramic roof',
    'vehicleOptions.equipment.heated_grips': 'Heated grips',
  };
  return translations[key] ?? key;
};

function createVehicleListing(
  id: string,
  equipment: string[],
  vehicleType: 'car' | 'moto' = 'car',
): Listing {
  return {
    id,
    title: `Listing ${id}`,
    city: 'Chisinau',
    status: 'Active',
    last_updated_at: '2024-01-01T00:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    equipment,
    vehicle: {
      id: `vehicle-${id}`,
      brand_id: 'brand-1',
      model_id: 'model-1',
      year: 2020,
      drive_type: 'FWD',
      body_type: vehicleType === 'moto' ? 'Motorcycle' : 'Sedan',
      model: {
        id: 'model-1',
        name: 'Model',
        brand_id: 'brand-1',
        order: 1,
        vehicle_types: [vehicleType],
      },
    },
  };
}

describe('vehicle equipment comparison fields', () => {
  it('returns applicable equipment fields when no listing has selected equipment', () => {
    const listings = [createVehicleListing('1', []), createVehicleListing('2', [])];
    const fieldKeys = getVehicleEquipmentComparisonFieldsForListings(listings, mockT).map(
      (field) => field.key,
    );

    expect(hasVehicleEquipmentToCompare(listings)).toBe(true);
    expect(fieldKeys.length).toBeGreaterThan(0);
    expect(fieldKeys).toEqual(
      expect.arrayContaining(['equipment-abs', 'equipment-air_conditioning']),
    );
  });

  it('keeps selected equipment union separate from applicable comparison rows', () => {
    const listings = [
      createVehicleListing('1', ['abs', 'navigation']),
      createVehicleListing('2', ['navigation']),
    ];
    expect(getSelectedEquipmentKeysUnion(listings).sort()).toEqual(['abs', 'navigation']);
    expect(getApplicableEquipmentKeysUnion(listings)).toEqual(
      expect.arrayContaining(['abs', 'air_conditioning', 'navigation']),
    );
    expect(
      getVehicleEquipmentComparisonFieldsForListings(listings, mockT).map((field) => field.key),
    ).toEqual(expect.arrayContaining(['equipment-abs', 'equipment-air_conditioning']));
  });

  it('marks selected applicable equipment as yes', () => {
    const listing = createVehicleListing('1', ['abs']);
    expect(getEquipmentCompareCellState(listing, 'abs')).toBe('yes');
    expect(getEquipmentCompareCellLabel(listing, 'abs', mockT)).toBe('Yes');
  });

  it('marks applicable but unselected equipment as dash', () => {
    const listing = createVehicleListing('1', []);
    expect(getEquipmentCompareCellState(listing, 'navigation')).toBe('dash');
    expect(getEquipmentCompareCellLabel(listing, 'navigation', mockT)).toBe('—');
  });

  it('marks equipment unavailable for vehicle type as N/A even when stored on listing', () => {
    const car = createVehicleListing('1', ['heated_grips'], 'car');
    const moto = createVehicleListing('2', ['panoramic_roof'], 'moto');

    expect(getEquipmentCompareCellState(car, 'heated_grips')).toBe('na');
    expect(getEquipmentCompareCellLabel(car, 'heated_grips', mockT)).toBe('N/A');

    expect(getEquipmentCompareCellState(moto, 'panoramic_roof')).toBe('na');
    expect(getEquipmentCompareCellLabel(moto, 'panoramic_roof', mockT)).toBe('N/A');
  });

  it('shows dash for same vehicle type when option is selected only on another listing', () => {
    const withAbs = createVehicleListing('1', ['abs']);
    const withoutAbs = createVehicleListing('2', []);

    expect(getEquipmentCompareCellState(withAbs, 'abs')).toBe('yes');
    expect(getEquipmentCompareCellState(withoutAbs, 'abs')).toBe('dash');
    expect(getEquipmentCompareCellLabel(withoutAbs, 'abs', mockT)).toBe('—');
  });

  it('omits rows that are not applicable to any compared listing type', () => {
    const listings = [
      createVehicleListing('1', ['heated_grips'], 'car'),
      createVehicleListing('2', ['heated_grips'], 'car'),
      createVehicleListing('3', ['heated_grips'], 'car'),
    ];
    const fieldKeys = getVehicleEquipmentComparisonFieldsForListings(listings, mockT).map(
      (field) => field.key,
    );

    expect(hasVehicleEquipmentToCompare(listings)).toBe(true);
    expect(fieldKeys).toEqual(expect.arrayContaining(['equipment-abs']));
    expect(fieldKeys).not.toContain('equipment-heated_grips');
  });
});
