import type { PlatformApiClient } from '../api/platform-api';

import {
  BrandModelResolver,
  buildBrandCandidateKeys,
  findBrandCandidates,
} from './brand-model-resolver';

describe('buildBrandCandidateKeys', () => {
  it('prefers Mercedes-Benz when 999 uses short Mercedes', () => {
    expect(buildBrandCandidateKeys('Mercedes', 'GLA')).toEqual(['mercedesbenz', 'mercedes']);
  });

  it('maps Lynk & Co source variants to lynkco', () => {
    expect(buildBrandCandidateKeys('Lynk', '& Co 02')).toEqual(['lynkco', 'lynk']);
    expect(buildBrandCandidateKeys('Lync&Co', '02')).toEqual(['lynkco', 'lyncco']);
    expect(buildBrandCandidateKeys('Lynk & Co', '02')).toEqual(['lynkco']);
  });
});

describe('findBrandCandidates', () => {
  it('resolves Mercedes to Mercedes-Benz brand in platform', () => {
    const brands = [
      { name: 'Mercedes-Benz', name_normalized: 'mercedesbenz' as string | null },
      { name: 'Other', name_normalized: 'other' },
    ];
    const found = findBrandCandidates(brands, 'Mercedes', 'GLA');
    expect(found.map((b) => b.name)).toEqual(['Mercedes-Benz']);
  });
});

describe('BrandModelResolver', () => {
  const toyotaBrand = {
    id: 'brand-toyota',
    name: 'Toyota',
    name_normalized: 'toyota' as string | null,
  };
  const camryModel = {
    id: 'model-camry',
    name: 'Camry',
    name_normalized: 'camry' as string | null,
  };
  const rangeRoverBrand = {
    id: 'brand-rr',
    name: 'Range Rover',
    name_normalized: 'rangerover' as string | null,
  };

  it('does not call createBrand when autoCreateBrands is false', async () => {
    const createBrand = jest.fn();
    const api = {
      getBrands: jest.fn().mockResolvedValue([]),
      getModelsByBrand: jest.fn(),
      createBrand,
      createModel: jest.fn(),
    } as unknown as PlatformApiClient;
    const resolver = new BrandModelResolver(api, {
      autoCreateBrands: false,
      autoCreateModels: true,
    });
    await expect(resolver.resolve('Unknown', 'X')).rejects.toThrow('Brand not found');
    expect(createBrand).not.toHaveBeenCalled();
  });

  it('calls createBrand only when autoCreateBrands is true', async () => {
    const createBrand = jest.fn().mockResolvedValue({ id: 'new-b', name: 'Unknown' });
    let brandLoads = 0;
    const api = {
      getBrands: jest.fn(async () => {
        brandLoads += 1;
        if (brandLoads === 1) {
          return [];
        }
        return [
          {
            id: 'new-b',
            name: 'Unknown',
            name_normalized: 'unknown' as string | null,
          },
        ];
      }),
      getModelsByBrand: jest.fn().mockResolvedValue([
        {
          id: 'model-x',
          name: 'X',
          name_normalized: 'x' as string | null,
        },
      ]),
      createBrand,
      createModel: jest.fn(),
    } as unknown as PlatformApiClient;
    const resolver = new BrandModelResolver(api, {
      autoCreateBrands: true,
      autoCreateModels: true,
    });
    const result = await resolver.resolve('Unknown', 'X');
    expect(createBrand).toHaveBeenCalledTimes(1);
    expect(createBrand).toHaveBeenCalledWith({
      name: 'Unknown',
      vehicleTypes: ['car'],
    });
    expect(result).toEqual({ brandId: 'new-b', modelId: 'model-x' });
  });

  it('does not call createModel when autoCreateModels is false', async () => {
    const createModel = jest.fn();
    const api = {
      getBrands: jest.fn().mockResolvedValue([toyotaBrand]),
      getModelsByBrand: jest.fn().mockResolvedValue([]),
      createBrand: jest.fn(),
      createModel,
    } as unknown as PlatformApiClient;
    const resolver = new BrandModelResolver(api, {
      autoCreateBrands: true,
      autoCreateModels: false,
    });
    await expect(resolver.resolve('Toyota', 'Prius')).rejects.toThrow('Model not found');
    expect(createModel).not.toHaveBeenCalled();
  });

  it('creates missing model and returns ids after cache reload', async () => {
    const createModel = jest.fn().mockResolvedValue({ id: 'model-new', name: 'Prius' });
    let modelLoads = 0;
    const api = {
      getBrands: jest.fn().mockResolvedValue([toyotaBrand]),
      getModelsByBrand: jest.fn(async () => {
        modelLoads += 1;
        if (modelLoads === 1) {
          return [];
        }
        return [
          {
            id: 'model-new',
            name: 'Prius',
            name_normalized: 'prius' as string | null,
          },
        ];
      }),
      createBrand: jest.fn(),
      createModel,
    } as unknown as PlatformApiClient;
    const resolver = new BrandModelResolver(api, {
      autoCreateBrands: false,
      autoCreateModels: true,
    });
    const result = await resolver.resolve('Toyota', 'Prius');
    expect(createModel).toHaveBeenCalledWith({
      brandId: 'brand-toyota',
      name: 'Prius',
      vehicleTypes: ['car'],
    });
    expect(result).toEqual({ brandId: 'brand-toyota', modelId: 'model-new' });
  });

  it('uses adapted model name for Range Rover Evoque', async () => {
    const createModel = jest.fn().mockResolvedValue({ id: 'model-evoque', name: 'Evoque' });
    let modelLoads = 0;
    const api = {
      getBrands: jest.fn().mockResolvedValue([rangeRoverBrand]),
      getModelsByBrand: jest.fn(async () => {
        modelLoads += 1;
        if (modelLoads === 1) {
          return [];
        }
        return [
          {
            id: 'model-evoque',
            name: 'Evoque',
            name_normalized: 'evoque' as string | null,
          },
        ];
      }),
      createBrand: jest.fn(),
      createModel,
    } as unknown as PlatformApiClient;
    const resolver = new BrandModelResolver(api, {
      autoCreateBrands: false,
      autoCreateModels: true,
    });
    await resolver.resolve('Range Rover', 'Range Rover Evoque');
    expect(createModel).toHaveBeenCalledWith({
      brandId: 'brand-rr',
      name: 'Evoque',
      vehicleTypes: ['car'],
    });
  });

  it('retries after HTTP 409 on createBrand and resolves existing brand', async () => {
    const createBrand = jest.fn().mockRejectedValue(new Error('HTTP 409 DUPLICATE_NAME'));
    let brandLoads = 0;
    const api = {
      getBrands: jest.fn(async () => {
        brandLoads += 1;
        if (brandLoads === 1) {
          return [];
        }
        return [toyotaBrand];
      }),
      getModelsByBrand: jest.fn().mockResolvedValue([camryModel]),
      createBrand,
      createModel: jest.fn(),
    } as unknown as PlatformApiClient;
    const resolver = new BrandModelResolver(api, {
      autoCreateBrands: true,
      autoCreateModels: true,
    });
    const result = await resolver.resolve('Toyota', 'Camry');
    expect(createBrand).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ brandId: 'brand-toyota', modelId: 'model-camry' });
  });

  it('retries after HTTP 409 on createModel and resolves existing model', async () => {
    const createModel = jest.fn().mockRejectedValue(new Error('HTTP 409 DUPLICATE_NAME'));
    let modelLoads = 0;
    const api = {
      getBrands: jest.fn().mockResolvedValue([toyotaBrand]),
      getModelsByBrand: jest.fn(async () => {
        modelLoads += 1;
        if (modelLoads === 1) {
          return [];
        }
        return [camryModel];
      }),
      createBrand: jest.fn(),
      createModel,
    } as unknown as PlatformApiClient;
    const resolver = new BrandModelResolver(api, {
      autoCreateBrands: false,
      autoCreateModels: true,
    });
    const result = await resolver.resolve('Toyota', 'Camry');
    expect(createModel).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ brandId: 'brand-toyota', modelId: 'model-camry' });
  });
});
