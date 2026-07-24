import { render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

import type { FilterState } from '@/hooks/useSearchFilters';
import type { PopularListingsData } from '@/lib/api';
import { getDefaultFilters } from '@/lib/search';

import { PopularFilters } from './PopularFilters';

jest.mock('@/lib/toast', () => ({
  toast: { error: jest.fn() },
}));

jest.mock('./PopularStatistics', () => ({
  PopularStatistics: () => null,
}));

jest.mock('@/lib/content/popular-brands', () => ({
  getPopularBrands: () => ['Toyota'],
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'searchFilters.popularBrands': 'Popular brands',
        'searchFilters.popularModels': 'Popular models',
        'searchFilters.youSelected': 'You selected',
        'searchFilters.noPopularModelsForBodyType': 'No popular models',
        'vehicleOptions.bodyType.Hatchback': 'Hatchback',
        'vehicleOptions.bodyType.Wagon': 'Wagon',
        'vehicleOptions.bodyType.SUV': 'SUV',
        'vehicleOptions.bodyType.Minivan': 'Minivan',
        'vehicleOptions.bodyType.Sedan': 'Sedan',
        'vehicleOptions.bodyType.Pickup': 'Pickup',
      };
      return map[key] ?? key;
    },
  }),
}));

function renderPopularFilters(popularData: PopularListingsData) {
  const Wrapper = () => {
    const [filters, setFilters] = useState<FilterState>(getDefaultFilters('2026') as FilterState);

    return (
      <PopularFilters
        brands={[]}
        models={[]}
        filters={filters}
        setFilters={setFilters}
        vehicleType="car"
        enableE2eTestIds
        popularData={popularData}
        popularLoading={false}
        popularError={false}
      />
    );
  };

  return render(<Wrapper />);
}

function createPopularData(
  bodyTypeListingCounts: PopularListingsData['bodyTypeListingCounts'],
): PopularListingsData {
  return {
    generatedAt: '2026-07-10T00:00:00.000Z',
    modelsByBodyType: {
      SUV: [],
      Sedan: [],
      Wagon: [],
      Hatchback: [],
      Minivan: [],
      Pickup: [],
    },
    brandListingCounts: {},
    bodyTypeListingCounts,
    statistics: {
      brands: { items: [], otherCount: 0, total: 0 },
      bodyTypes: { items: [], otherCount: 0, total: 0 },
      fuels: { items: [], otherCount: 0, total: 0 },
    },
  };
}

describe('PopularFilters', () => {
  it('lists body type sections in catalog order and opens the first one', async () => {
    renderPopularFilters(
      createPopularData({
        SUV: 10,
        Sedan: 100,
        Wagon: 50,
        Hatchback: 200,
        Minivan: 5,
        Pickup: 1,
      }),
    );

    await waitFor(() => {
      expect(screen.getByTestId('search-popular-body-type-SUV-toggle')).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });

    expect(screen.getByTestId('search-popular-body-type-Hatchback-toggle')).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    const toggles = screen.getAllByRole('button', {
      name: /Hatchback|SUV|Wagon|Minivan|Sedan|Pickup/i,
    });
    const bodyTypeLabels = toggles
      .map((button) => button.textContent?.trim())
      .filter((label): label is string => Boolean(label));

    expect(bodyTypeLabels).toEqual(['SUV', 'Sedan', 'Wagon', 'Hatchback', 'Minivan', 'Pickup']);
  });
});
