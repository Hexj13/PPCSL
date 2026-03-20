import { resolveSubcategoryToVehicleType } from './subcategory-vehicle-type';

describe('resolveSubcategoryToVehicleType', () => {
  it('resolves cars subcategory by id', () => {
    expect(resolveSubcategoryToVehicleType({ subCategoryId: 659 })).toEqual({
      kind: 'ok',
      vehicleType: 'car',
    });
  });

  it('resolves trucks subcategory by url', () => {
    expect(resolveSubcategoryToVehicleType({ subCategoryUrl: 'transport/trucks' })).toEqual({
      kind: 'ok',
      vehicleType: 'truck',
    });
  });

  it('resolves motorcycles by id', () => {
    expect(resolveSubcategoryToVehicleType({ subCategoryId: 663 })).toEqual({
      kind: 'ok',
      vehicleType: 'moto',
    });
  });

  it('skips bicycles', () => {
    const r = resolveSubcategoryToVehicleType({ subCategoryId: 664 });
    expect(r.kind).toBe('skip');
    if (r.kind === 'skip') {
      expect(r.reason).toContain('bicycles');
    }
  });

  it('returns unmapped for unknown transport leaf', () => {
    const r = resolveSubcategoryToVehicleType({
      subCategoryId: 999001,
      subCategoryUrl: 'transport/unknown-leaf',
    });
    expect(r.kind).toBe('skip');
    if (r.kind === 'skip') {
      expect(r.reason).toContain('UNMAPPED_SUBCATEGORY');
    }
  });
});
