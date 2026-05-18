import type { FilterState } from '@/hooks/useSearchFilters';
import { LISTING_GRID_PAGE_SIZE } from '@/lib/constants';

import {
  buildFallbackListingSearchParamsFromFilters,
  isGetParsedListingSearchParamsFailure,
} from './build-fallback-listing-search-params';

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
  seller_type: '',
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

describe('isGetParsedListingSearchParamsFailure', () => {
  it('returns true for getParsedListingSearchParams catch fallback shape', () => {
    expect(
      isGetParsedListingSearchParamsFailure({
        page: 1,
        limit: LISTING_GRID_PAGE_SIZE,
      }),
    ).toBe(true);
  });

  it('returns false when vehicleType is present', () => {
    expect(
      isGetParsedListingSearchParamsFailure({
        page: 1,
        limit: 20,
        vehicleType: 'car',
      }),
    ).toBe(false);
  });
});

describe('buildFallbackListingSearchParamsFromFilters', () => {
  it('includes comma-separated brand and model ids', () => {
    const params = buildFallbackListingSearchParamsFromFilters(
      {
        ...baseFilters,
        brand_ids: ['b1', 'b2'],
        model_ids: ['m1'],
      },
      'car',
    );
    expect(params.brand_ids).toBe('b1,b2');
    expect(params.model_ids).toBe('m1');
    expect(params.vehicleType).toBe('car');
    expect(params.page).toBe(1);
    expect(params.limit).toBe(1);
  });

  it('maps numeric and boolean fields', () => {
    const params = buildFallbackListingSearchParamsFromFilters(
      {
        ...baseFilters,
        year_gte: '2015',
        price_gte: '5 000',
        urgent: true,
        engine_displ_l_gte: '1,6',
      },
      'truck',
    );
    expect(params.year_gte).toBe(2015);
    expect(params.price_gte).toBe(5000);
    expect(params.urgent).toBe(true);
    expect(params.engine_displ_l_gte).toBe(1.6);
    expect(params.vehicleType).toBe('truck');
  });
});
