import { buildMinimalCategorySearchUrl } from './search-params';

describe('buildMinimalCategorySearchUrl', () => {
  it('returns / when no category or non-default vehicle context', () => {
    expect(buildMinimalCategorySearchUrl(new URLSearchParams(''))).toBe('/');
    expect(buildMinimalCategorySearchUrl(new URLSearchParams('page=1'))).toBe('/');
    expect(buildMinimalCategorySearchUrl(new URLSearchParams('vehicleType=car'))).toBe('/');
  });

  it('preserves tire category and optional tireVehicleType', () => {
    expect(buildMinimalCategorySearchUrl(new URLSearchParams('category=tire'))).toBe(
      '/?category=tire',
    );
    expect(
      buildMinimalCategorySearchUrl(new URLSearchParams('category=tire&tireVehicleType=moto')),
    ).toBe('/?category=tire&tireVehicleType=moto');
    expect(
      buildMinimalCategorySearchUrl(
        new URLSearchParams('category=tire&tireVehicleType=moto&tire_widths=195'),
      ),
    ).toBe('/?category=tire&tireVehicleType=moto');
  });

  it('ignores invalid tireVehicleType', () => {
    expect(
      buildMinimalCategorySearchUrl(new URLSearchParams('category=tire&tireVehicleType=plane')),
    ).toBe('/?category=tire');
  });

  it('preserves non-car vehicleType for vehicle search', () => {
    expect(buildMinimalCategorySearchUrl(new URLSearchParams('vehicleType=moto'))).toBe(
      '/?vehicleType=moto',
    );
    expect(buildMinimalCategorySearchUrl(new URLSearchParams('vehicleType=truck'))).toBe(
      '/?vehicleType=truck',
    );
  });
});
