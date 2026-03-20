import { act, renderHook, waitFor } from '@testing-library/react';

import { LISTING_GRID_PAGE_SIZE } from '@/lib/constants';

import { useAvailableListingsCount } from './useAvailableListingsCount';
import type { FilterState } from './useSearchFilters';

const mockGetAll = jest.fn();
const mockGetParsedListingSearchParams = jest.fn();
const mockBuildSearchQuery = jest.fn();

const WAIT_TIMEOUT_MS = 4000;

jest.mock('@/lib/api', () => ({
  listingsApi: {
    getAll: (...args: unknown[]) => mockGetAll(...args),
  },
}));

jest.mock('@/lib/search', () => {
  const actual = jest.requireActual('@/lib/search');
  return {
    ...actual,
    getParsedListingSearchParams: (...args: unknown[]) => mockGetParsedListingSearchParams(...args),
  };
});

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
    jest.clearAllMocks();
    mockBuildSearchQuery.mockReturnValue({ urlString: 'vehicleType=car' });
    mockGetParsedListingSearchParams.mockResolvedValue({ vehicleType: 'car' });
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

    await waitFor(
      () => {
        expect(result.current.total).toBe(42);
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: WAIT_TIMEOUT_MS },
    );
  });

  it('keeps loading false while syncing from url', () => {
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

    await waitFor(
      () => {
        expect(result.current.total).toBe(0);
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: WAIT_TIMEOUT_MS },
    );
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

    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });

    rerender({
      filters: {
        ...baseFilters,
        price_gte: '2000',
      },
    });

    await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(1), { timeout: WAIT_TIMEOUT_MS });
  });

  it('calls getAll with parsed params and string CSV fields for brand, model, and arrays', async () => {
    mockGetParsedListingSearchParams.mockResolvedValue({
      page: 1,
      limit: 20,
      vehicleType: 'car',
      brand_ids: 'brand-uuid-1,brand-uuid-2',
      model_ids: 'model-uuid-1',
      fuels: 'Diesel',
    });
    mockGetAll.mockResolvedValue({ data: { meta: { total: 5 } } });

    const { result } = renderHook(() =>
      useAvailableListingsCount({
        filters: {
          ...baseFilters,
          brand_ids: ['brand-uuid-1', 'brand-uuid-2'],
          model_ids: ['model-uuid-1'],
          fuels: ['Diesel'],
        },
        brands: [],
        models: [],
        cities: [],
        vehicleType: 'car',
        currentYear: '2026',
        isSyncingFromUrl: false,
      }),
    );

    await waitFor(() => expect(result.current.total).toBe(5), { timeout: WAIT_TIMEOUT_MS });

    expect(mockGetAll).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleType: 'car',
        page: 1,
        limit: 1,
        brand_ids: 'brand-uuid-1,brand-uuid-2',
        model_ids: 'model-uuid-1',
        fuels: 'Diesel',
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('calls getAll with parsed cities and equipment as CSV strings', async () => {
    mockGetParsedListingSearchParams.mockResolvedValue({
      page: 1,
      limit: 20,
      vehicleType: 'car',
      cities: 'Chisinau,Balti',
      equipment: 'abs,esp',
      equipmentMatch: 'partial',
    });
    mockGetAll.mockResolvedValue({ data: { meta: { total: 3 } } });

    const { result } = renderHook(() =>
      useAvailableListingsCount({
        filters: {
          ...baseFilters,
          cities: ['Chisinau', 'Balti'],
          equipment: ['abs', 'esp'],
          equipment_match_mode: 'partial',
        },
        brands: [],
        models: [],
        cities: [],
        vehicleType: 'car',
        currentYear: '2026',
        isSyncingFromUrl: false,
      }),
    );

    await waitFor(() => expect(result.current.total).toBe(3), { timeout: WAIT_TIMEOUT_MS });

    expect(mockGetAll).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleType: 'car',
        page: 1,
        limit: 1,
        cities: 'Chisinau,Balti',
        equipment: 'abs,esp',
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('uses filter fallback when parse returns only page and limit', async () => {
    mockGetParsedListingSearchParams.mockResolvedValue({
      page: 1,
      limit: LISTING_GRID_PAGE_SIZE,
    });
    mockGetAll.mockResolvedValue({ data: { meta: { total: 7 } } });

    const { result } = renderHook(() =>
      useAvailableListingsCount({
        filters: {
          ...baseFilters,
          brand_ids: ['550e8400-e29b-41d4-a716-446655440001'],
          model_ids: ['660e8400-e29b-41d4-a716-446655440002'],
        },
        brands: [],
        models: [],
        cities: [],
        vehicleType: 'car',
        currentYear: '2026',
        isSyncingFromUrl: false,
      }),
    );

    await waitFor(() => expect(result.current.total).toBe(7), { timeout: WAIT_TIMEOUT_MS });

    expect(mockGetAll).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleType: 'car',
        page: 1,
        limit: 1,
        brand_ids: '550e8400-e29b-41d4-a716-446655440001',
        model_ids: '660e8400-e29b-41d4-a716-446655440002',
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
