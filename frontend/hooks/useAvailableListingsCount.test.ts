import { act, renderHook, waitFor } from '@testing-library/react';

import { useAvailableListingsCount } from './useAvailableListingsCount';
import type { FilterState } from './useSearchFilters';

const mockGetAll = jest.fn();
const mockGetParsedListingSearchParams = jest.fn();
const mockBuildSearchQuery = jest.fn();

jest.mock('@/lib/api', () => ({
  listingsApi: {
    getAll: (...args: unknown[]) => mockGetAll(...args),
  },
}));

jest.mock('@/lib/search', () => ({
  getParsedListingSearchParams: (...args: unknown[]) => mockGetParsedListingSearchParams(...args),
}));

jest.mock('@/lib/search/search-params', () => ({
  buildSearchQuery: (...args: unknown[]) => mockBuildSearchQuery(...args),
}));

const baseFilters: FilterState = {
  brand_ids: [],
  model_ids: [],
  cities: [],
  year_gte: '',
  year_lte: '',
  price_gte: '',
  price_lte: '',
  mileage_gte: '',
  mileage_lte: '',
  fuels: [],
  transmissions: [],
  body_types: [],
  engine_displ_l_gte: '',
  engine_displ_l_lte: '',
  colors: [],
  doors: [],
  currency: '',
  urgent: false,
  is_new: false,
  available_in_credit: false,
  down_payment_amount_gte: '',
  conditions: [],
  registration_types: [],
  horsepower_gte: '',
  horsepower_lte: '',
  drive_types: [],
  equipment: [],
  equipment_match_mode: 'full',
  sortBy: 'created_at',
  sortOrder: 'DESC',
};

describe('useAvailableListingsCount', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockBuildSearchQuery.mockReturnValue({ urlString: 'vehicleType=car' });
    mockGetParsedListingSearchParams.mockResolvedValue({ vehicleType: 'car' });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('loads total count after debounce', async () => {
    mockGetAll.mockResolvedValue({ data: { meta: { total: 42 } } });

    const { result } = renderHook(() =>
      useAvailableListingsCount({
        filters: baseFilters,
        brands: [],
        models: [],
        cities: [],
        vehicleType: 'car',
        currentYear: '2026',
        isSyncingFromUrl: false,
      }),
    );

    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(result.current.total).toBe(42);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('keeps loading false while syncing from url', async () => {
    const { result } = renderHook(() =>
      useAvailableListingsCount({
        filters: baseFilters,
        brands: [],
        models: [],
        cities: [],
        vehicleType: 'car',
        currentYear: '2026',
        isSyncingFromUrl: true,
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockGetAll).not.toHaveBeenCalled();
  });

  it('supports zero total value', async () => {
    mockGetAll.mockResolvedValue({ data: { meta: { total: 0 } } });

    const { result } = renderHook(() =>
      useAvailableListingsCount({
        filters: baseFilters,
        brands: [],
        models: [],
        cities: [],
        vehicleType: 'car',
        currentYear: '2026',
        isSyncingFromUrl: false,
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(result.current.total).toBe(0);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('triggers only latest request for rapid changes', async () => {
    mockGetAll.mockResolvedValue({ data: { meta: { total: 11 } } });

    const { rerender } = renderHook(
      ({ filters }) =>
        useAvailableListingsCount({
          filters,
          brands: [],
          models: [],
          cities: [],
          vehicleType: 'car',
          currentYear: '2026',
          isSyncingFromUrl: false,
        }),
      { initialProps: { filters: baseFilters } },
    );

    rerender({
      filters: {
        ...baseFilters,
        price_gte: '1000',
      },
    });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    rerender({
      filters: {
        ...baseFilters,
        price_gte: '2000',
      },
    });

    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(mockGetAll).toHaveBeenCalledTimes(1);
    });
  });
});
