import { renderHook } from '@testing-library/react';

import { getVehicleTypeFromUrlAndBodyTypesOnly, useVehicleType } from './useVehicleType';

const replaceMock = jest.fn();

jest.mock('@/hooks/useLocalizedNavigation', () => ({
  useLocalizedNavigation: () => ({
    replace: replaceMock,
    href: (path: string) => path,
  }),
}));

jest.mock('@/lib/analytics', () => ({
  analytics: { selectVehicleType: jest.fn() },
}));

jest.mock('@/lib/browser-local-storage', () => ({
  localStorageGetItem: jest.fn(() => 'moto'),
  localStorageSetItem: jest.fn(),
}));

function createSearchParams(query: string) {
  const params = new URLSearchParams(query);
  return {
    get: (key: string) => params.get(key),
    toString: () => params.toString(),
  } as Parameters<typeof useVehicleType>[0]['searchParams'];
}

const defaultHookOptions = {
  resetToVehicleSearchDefaults: jest.fn(),
  setLastAppliedFilters: jest.fn(),
  setActiveTab: jest.fn(),
};

describe('getVehicleTypeFromUrlAndBodyTypesOnly', () => {
  it('should return car when URL has no vehicleType', () => {
    expect(getVehicleTypeFromUrlAndBodyTypesOnly(createSearchParams(''))).toBe('car');
  });

  it('should return vehicleType from URL when present', () => {
    expect(getVehicleTypeFromUrlAndBodyTypesOnly(createSearchParams('vehicleType=moto'))).toBe(
      'moto',
    );
    expect(getVehicleTypeFromUrlAndBodyTypesOnly(createSearchParams('vehicleType=truck'))).toBe(
      'truck',
    );
  });
});

describe('useVehicleType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use car from URL when localStorage has moto but URL has no vehicleType', () => {
    const searchParams = createSearchParams('');
    const { result } = renderHook(() =>
      useVehicleType({
        searchParams,
        ...defaultHookOptions,
      }),
    );

    expect(result.current.vehicleType).toBe('car');
  });

  it('should keep moto when URL specifies vehicleType=moto', () => {
    const searchParams = createSearchParams('vehicleType=moto');
    const { result } = renderHook(() =>
      useVehicleType({
        searchParams,
        ...defaultHookOptions,
      }),
    );

    expect(result.current.vehicleType).toBe('moto');
  });

  it('should switch to car when URL changes from vehicleType=moto to clean home', () => {
    let query = 'vehicleType=moto';
    const searchParams = createSearchParams(query);
    const { result, rerender } = renderHook(
      ({ params }) =>
        useVehicleType({
          searchParams: params,
          ...defaultHookOptions,
        }),
      { initialProps: { params: searchParams } },
    );

    expect(result.current.vehicleType).toBe('moto');

    query = '';
    rerender({ params: createSearchParams(query) });

    expect(result.current.vehicleType).toBe('car');
  });

  it('should not read vehicleType from localStorage when URL is clean', () => {
    const { localStorageGetItem } = jest.requireMock('@/lib/browser-local-storage') as {
      localStorageGetItem: jest.Mock;
    };
    localStorageGetItem.mockReturnValue('moto');

    const searchParams = createSearchParams('brand=peugeot');
    const { result } = renderHook(() =>
      useVehicleType({
        searchParams,
        ...defaultHookOptions,
      }),
    );

    expect(result.current.vehicleType).toBe('car');
    expect(localStorageGetItem).not.toHaveBeenCalled();
  });

  it('should ignore vehicle type sync when category is tire', () => {
    const searchParams = createSearchParams('category=tire');
    const { result, rerender } = renderHook(
      ({ params }) =>
        useVehicleType({
          searchParams: params,
          ...defaultHookOptions,
        }),
      { initialProps: { params: createSearchParams('vehicleType=moto') } },
    );

    expect(result.current.vehicleType).toBe('moto');

    rerender({ params: searchParams });

    expect(result.current.vehicleType).toBe('moto');
  });
});
