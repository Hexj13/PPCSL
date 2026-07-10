import { act, renderHook, waitFor } from '@testing-library/react';

import { listingsApi, type PopularListingsData } from '@/lib/api';

import { clearPopularListingsCache, usePopularListingsData } from './usePopularListingsData';

jest.mock('@/lib/api', () => ({
  listingsApi: {
    getPopular: jest.fn(),
  },
}));

const sampleData: PopularListingsData = {
  generatedAt: '2026-07-10T00:00:00.000Z',
  modelsByBodyType: {
    Hatchback: [],
    Wagon: [],
    SUV: [],
    Minivan: [],
    Sedan: [],
    Convertible: [],
  },
  brandListingCounts: {},
  bodyTypeListingCounts: {
    Hatchback: 0,
    Wagon: 0,
    SUV: 0,
    Minivan: 0,
    Sedan: 0,
    Convertible: 0,
  },
  statistics: {
    brands: { items: [], otherCount: 0, total: 0 },
    bodyTypes: { items: [], otherCount: 0, total: 0 },
    fuels: { items: [], otherCount: 0, total: 0 },
  },
};

describe('usePopularListingsData', () => {
  beforeEach(() => {
    clearPopularListingsCache();
    jest.clearAllMocks();
  });

  it('does not fetch when disabled', () => {
    const { result } = renderHook(() => usePopularListingsData(false));
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(listingsApi.getPopular).not.toHaveBeenCalled();
  });

  it('fetches once and reuses in-flight promise for concurrent mounts', async () => {
    let resolveRequest: (value: { data: PopularListingsData }) => void = () => undefined;
    (listingsApi.getPopular as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const { result: resultOne } = renderHook(() => usePopularListingsData(true));
    const { result: resultTwo } = renderHook(() => usePopularListingsData(true));

    expect(listingsApi.getPopular).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRequest({ data: sampleData });
    });

    await waitFor(() => {
      expect(resultOne.current.data).toEqual(sampleData);
      expect(resultTwo.current.data).toEqual(sampleData);
    });
    expect(listingsApi.getPopular).toHaveBeenCalledTimes(1);
  });

  it('returns cached data without refetch', async () => {
    (listingsApi.getPopular as jest.Mock).mockResolvedValue({ data: sampleData });

    const { result, unmount } = renderHook(() => usePopularListingsData(true));
    await waitFor(() => {
      expect(result.current.data).toEqual(sampleData);
    });
    unmount();

    const { result: cachedResult } = renderHook(() => usePopularListingsData(true));
    expect(cachedResult.current.data).toEqual(sampleData);
    expect(listingsApi.getPopular).toHaveBeenCalledTimes(1);
  });
});
