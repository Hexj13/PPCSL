import { act, renderHook, waitFor } from '@testing-library/react';

import type { Listing } from '@/lib/api';
import { listingsApi } from '@/lib/api';

import { useComparePageListings } from './useComparePageListings';

const mockT = (key: string) => key;

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: mockT }),
}));

jest.mock('@/hooks/useApiErrorToast', () => {
  const showApiError = jest.fn();
  return {
    useApiErrorToast: () => showApiError,
  };
});

jest.mock('@/lib/toast', () => ({
  toast: { error: jest.fn(), warning: jest.fn(), success: jest.fn() },
}));

jest.mock('@/lib/browser-local-storage', () => ({
  localStorageGetItem: jest.fn(() => null),
}));

const compareVehicleIds = [
  '7cdbef29-a581-4c07-b62b-9c80ec952f18',
  '07566aaa-5e53-454d-aa85-8653c9f2e35e',
  '7a7b0c5b-ee04-442f-bd6a-435211abea2f',
];

const mockListing = (id: string): Listing =>
  ({
    id,
    title: `Listing ${id}`,
    status: 'Active',
    category: 'vehicle',
    city: 'Chisinau',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    last_updated_at: '2024-01-01T00:00:00.000Z',
    vehicle: {
      id: 'vehicle-1',
      brand: { id: 'brand-1', name: 'Brand' },
      model: { id: 'model-1', name: 'Model' },
      year: 2020,
      vehicle_type: 'car',
    },
  }) as Listing;

let comparisonState = {
  vehicleComparisons: [...compareVehicleIds],
  tireComparisons: [] as string[],
};

const stableStoreActions = {
  removeVehicle: jest.fn(),
  removeTire: jest.fn(),
  clearVehicles: jest.fn(),
  clearTires: jest.fn(),
};

const mockRehydrate = jest.fn(async () => {
  comparisonState = {
    vehicleComparisons: [...compareVehicleIds],
    tireComparisons: [],
  };
});

jest.mock('@/lib/api', () => ({
  listingsApi: {
    getOne: jest.fn((id: string) => Promise.resolve({ data: mockListing(id) })),
  },
  comparisonApi: {
    remove: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@/lib/store', () => ({
  useAuthStore: jest.fn((selector: (state: { user: null }) => unknown) => selector({ user: null })),
  useComparisonStore: Object.assign(
    jest.fn((selector: (state: Record<string, unknown>) => unknown) => {
      const state = {
        vehicleComparisons: comparisonState.vehicleComparisons,
        tireComparisons: comparisonState.tireComparisons,
        ...stableStoreActions,
      };
      return selector(state);
    }),
    {
      getState: () => ({
        vehicleComparisons: comparisonState.vehicleComparisons,
        tireComparisons: comparisonState.tireComparisons,
      }),
    },
  ),
}));

describe('useComparePageListings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    comparisonState = {
      vehicleComparisons: [...compareVehicleIds],
      tireComparisons: [],
    };
    mockRehydrate.mockImplementation(async () => {
      comparisonState = {
        vehicleComparisons: [...compareVehicleIds],
        tireComparisons: [],
      };
    });
    (listingsApi.getOne as jest.Mock).mockImplementation((id: string) =>
      Promise.resolve({ data: mockListing(id) }),
    );
  });

  it('fetches each compare listing only once when rehydrate replaces array refs', async () => {
    const { rerender } = renderHook(
      ({ vehicleIds, tireIds }: { vehicleIds: string[]; tireIds: string[] }) =>
        useComparePageListings(vehicleIds, tireIds, true, mockRehydrate),
      {
        initialProps: {
          vehicleIds: [...compareVehicleIds],
          tireIds: [] as string[],
        },
      },
    );

    await waitFor(() => {
      expect(mockRehydrate).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(listingsApi.getOne).toHaveBeenCalledTimes(3);
    });

    const getOneCallsAfterFirstSync = (listingsApi.getOne as jest.Mock).mock.calls.length;

    rerender({
      vehicleIds: [...compareVehicleIds],
      tireIds: [],
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(listingsApi.getOne).toHaveBeenCalledTimes(getOneCallsAfterFirstSync);
    for (const id of compareVehicleIds) {
      expect(listingsApi.getOne).toHaveBeenCalledWith(id);
    }
  });
});
