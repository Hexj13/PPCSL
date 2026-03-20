import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';

import { MAX_SEARCH_BRAND_SELECTIONS, MAX_SEARCH_MODEL_SELECTIONS } from '@/lib/constants';

import { usePopularModels } from './usePopularModels';
import type { FilterState } from './useSearchFilters';

const createDefaultFilters = (): FilterState => ({
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
  conditions: [],
  registration_types: [],
  horsepower_gte: '',
  horsepower_lte: '',
  drive_types: [],
  available_in_credit: false,
  down_payment_amount_gte: '',
  equipment: [],
  equipment_match_mode: 'full',
  sortBy: 'created_at',
  sortOrder: 'DESC',
});

describe('usePopularModels', () => {
  it('does not allow selecting model above limit', () => {
    const brands = [{ id: 'brand-1', name: 'Brand 1' }];
    const models = Array.from({ length: MAX_SEARCH_MODEL_SELECTIONS + 1 }, (_, index) => ({
      id: `model-${index + 1}`,
      name: `Model ${index + 1}`,
      brand_id: 'brand-1',
    }));
    const onModelLimitReached = jest.fn();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<FilterState>({
        ...createDefaultFilters(),
        brand_ids: ['brand-1'],
        model_ids: models.slice(0, MAX_SEARCH_MODEL_SELECTIONS).map((model) => model.id),
      });
      return usePopularModels({
        brands,
        models,
        filters,
        setFilters,
        vehicleType: 'car',
        onModelLimitReached,
      });
    });

    act(() => {
      result.current.toggleModel('Brand 1', `Model ${MAX_SEARCH_MODEL_SELECTIONS + 1}`);
    });

    expect(onModelLimitReached).toHaveBeenCalledTimes(1);
  });

  it('does not allow selecting brand above limit', () => {
    const brands = Array.from({ length: MAX_SEARCH_BRAND_SELECTIONS + 1 }, (_, index) => ({
      id: `brand-${index + 1}`,
      name: `Brand ${index + 1}`,
    }));
    const models: Array<{ id: string; name: string; brand_id: string }> = [];
    const onBrandLimitReached = jest.fn();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<FilterState>({
        ...createDefaultFilters(),
        brand_ids: brands.slice(0, MAX_SEARCH_BRAND_SELECTIONS).map((brand) => brand.id),
      });
      return usePopularModels({
        brands,
        models,
        filters,
        setFilters,
        vehicleType: 'car',
        onBrandLimitReached,
      });
    });

    act(() => {
      result.current.toggleBrand(`Brand ${MAX_SEARCH_BRAND_SELECTIONS + 1}`);
    });

    expect(onBrandLimitReached).toHaveBeenCalledTimes(1);
  });
});
