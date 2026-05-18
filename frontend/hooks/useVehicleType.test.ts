import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

import { getVehicleTypeFromUrlAndBodyTypesOnly, useVehicleType } from './useVehicleType';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/analytics', () => ({
  analytics: {
    selectVehicleType: jest.fn(),
  },
}));

const mockReplace = jest.fn();

function createSearchParams(entries: Record<string, string>): ReadonlyURLSearchParams {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(entries)) {
    sp.set(k, v);
  }
  return sp as ReadonlyURLSearchParams;
}

describe('getVehicleTypeFromUrlAndBodyTypesOnly', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('kupito_vehicle_type', 'truck');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns car for empty params regardless of localStorage', () => {
    expect(getVehicleTypeFromUrlAndBodyTypesOnly(new URLSearchParams())).toBe('car');
  });

  it('returns vehicleType from URL when valid', () => {
    expect(getVehicleTypeFromUrlAndBodyTypesOnly(createSearchParams({ vehicleType: 'moto' }))).toBe(
      'moto',
    );
  });

  it('returns uniform category from body_types when present', () => {
    expect(getVehicleTypeFromUrlAndBodyTypesOnly(createSearchParams({ body_types: 'Van' }))).toBe(
      'truck',
    );
  });
});

describe('useVehicleType', () => {
  const noopSetState = () => {};
  const noopTab = () => {};

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('applies stored vehicle type when URL does not specify it', async () => {
    localStorage.setItem('kupito_vehicle_type', 'truck');
    const searchParams = createSearchParams({});

    const { result } = renderHook(() =>
      useVehicleType({
        searchParams,
        resetToVehicleSearchDefaults: noopSetState,
        setLastAppliedFilters: noopSetState,
        setActiveTab: noopTab,
      }),
    );

    await waitFor(() => {
      expect(result.current.vehicleType).toBe('truck');
    });
  });

  it('keeps URL vehicleType over localStorage', async () => {
    localStorage.setItem('kupito_vehicle_type', 'truck');
    const searchParams = createSearchParams({ vehicleType: 'moto' });

    const { result } = renderHook(() =>
      useVehicleType({
        searchParams,
        resetToVehicleSearchDefaults: noopSetState,
        setLastAppliedFilters: noopSetState,
        setActiveTab: noopTab,
      }),
    );

    expect(result.current.vehicleType).toBe('moto');
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.vehicleType).toBe('moto');
  });

  it('does not override body-derived type with localStorage', async () => {
    localStorage.setItem('kupito_vehicle_type', 'moto');
    const searchParams = createSearchParams({ body_types: 'Van' });

    const { result } = renderHook(() =>
      useVehicleType({
        searchParams,
        resetToVehicleSearchDefaults: noopSetState,
        setLastAppliedFilters: noopSetState,
        setActiveTab: noopTab,
      }),
    );

    expect(result.current.vehicleType).toBe('truck');
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.vehicleType).toBe('truck');
  });
});
