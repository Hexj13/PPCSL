import type { Brand, VehicleModel } from '@/lib/api';

import {
  buildMinimalCategorySearchUrl,
  createBrandResolver,
  createModelResolver,
  encodeArray,
} from './search-params';
import { decodeBase64Array, encodeBase64Array } from './search-params-encoding';

describe('encodeArray / encodeBase64Array / decodeBase64Array', () => {
  it('returns empty string for empty array', () => {
    expect(encodeArray([])).toBe('');
    expect(encodeBase64Array([])).toBe('');
  });

  it('round-trips string arrays via URL-safe base64', () => {
    const values = ['petrol', 'diesel', 'hybrid'];
    const encoded = encodeArray(values);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
    expect(decodeBase64Array(encoded)).toEqual(values);
    expect(decodeBase64Array(encodeBase64Array(values))).toEqual(values);
  });

  it('falls back to comma-split when input is not valid base64 JSON', () => {
    expect(decodeBase64Array('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('returns empty array for empty encoded string', () => {
    expect(decodeBase64Array('')).toEqual([]);
  });
});

describe('buildMinimalCategorySearchUrl', () => {
  it('returns / when no category or vehicle type params', () => {
    expect(buildMinimalCategorySearchUrl(new URLSearchParams('price_gte=1000'))).toBe('/');
  });

  it('keeps non-default vehicleType for vehicles', () => {
    expect(buildMinimalCategorySearchUrl(new URLSearchParams('vehicleType=truck'))).toBe(
      '/?vehicleType=truck',
    );
  });

  it('drops default car vehicleType', () => {
    expect(buildMinimalCategorySearchUrl(new URLSearchParams('vehicleType=car'))).toBe('/');
  });

  it('keeps tire category and valid tireVehicleType', () => {
    expect(
      buildMinimalCategorySearchUrl(
        new URLSearchParams('category=tire&tireVehicleType=moto&width=205'),
      ),
    ).toBe('/?category=tire&tireVehicleType=moto');
  });

  it('ignores invalid tireVehicleType', () => {
    expect(
      buildMinimalCategorySearchUrl(new URLSearchParams('category=tire&tireVehicleType=boat')),
    ).toBe('/?category=tire');
  });
});

describe('createBrandResolver / createModelResolver', () => {
  const brands: Brand[] = [
    {
      id: 'brand-1',
      name: 'Toyota',
      vehicle_type: 'car',
    } as Brand,
    {
      id: 'brand-2',
      name: 'BMW',
      vehicle_type: 'car',
    } as Brand,
  ];

  const modelsByBrand: Record<string, VehicleModel[]> = {
    'brand-1': [
      { id: 'model-1', name: 'Corolla', brand_id: 'brand-1' } as VehicleModel,
      { id: 'model-2', name: 'Yaris', brand_id: 'brand-1' } as VehicleModel,
    ],
    'brand-2': [{ id: 'model-3', name: 'X5', brand_id: 'brand-2' } as VehicleModel],
  };

  it('resolves brand slugs to ids', async () => {
    const resolve = createBrandResolver(brands);
    await expect(resolve(['toyota', 'bmw'])).resolves.toEqual(['brand-1', 'brand-2']);
  });

  it('skips unknown brand slugs', async () => {
    const resolve = createBrandResolver(brands);
    await expect(resolve(['toyota', 'unknown'])).resolves.toEqual(['brand-1']);
  });

  it('resolves model slugs within brand ids', async () => {
    const resolve = createModelResolver(modelsByBrand);
    await expect(resolve(['brand-1'], ['corolla', 'yaris'])).resolves.toEqual([
      'model-1',
      'model-2',
    ]);
  });

  it('does not resolve models from other brands', async () => {
    const resolve = createModelResolver(modelsByBrand);
    await expect(resolve(['brand-1'], ['x5'])).resolves.toEqual([]);
  });
});
