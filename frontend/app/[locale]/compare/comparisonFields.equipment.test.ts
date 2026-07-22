import { getEquipmentCompareCellState, hasVehicleEquipmentToCompare } from './comparisonFields';

const listingWithEquipment = {
  id: 'l1',
  equipment: ['abs', 'air_conditioning'],
  vehicle: { brand_id: 'b1', model_id: 'm1', year: 2020 },
} as never;

const listingWithoutSelectedEquipment = {
  id: 'l2',
  equipment: [],
  vehicle: { brand_id: 'b1', model_id: 'm1', year: 2019 },
} as never;

describe('comparisonFields equipment helpers', () => {
  it('returns yes, dash, or na for equipment cells', () => {
    expect(getEquipmentCompareCellState(listingWithEquipment, 'abs')).toBe('yes');
    expect(getEquipmentCompareCellState(listingWithEquipment, 'sunroof')).toBe('dash');
    expect(getEquipmentCompareCellState(listingWithoutSelectedEquipment, 'abs')).toBe('dash');
  });

  it('detects when vehicle equipment comparison is available', () => {
    expect(
      hasVehicleEquipmentToCompare([listingWithEquipment, listingWithoutSelectedEquipment]),
    ).toBe(true);
    expect(hasVehicleEquipmentToCompare([listingWithoutSelectedEquipment])).toBe(true);
  });
});
