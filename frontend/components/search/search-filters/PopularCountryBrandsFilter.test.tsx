import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { Brand } from '@/lib/api';
import { MAX_SEARCH_BRAND_SELECTIONS } from '@/lib/constants';

import { PopularCountryBrandsFilter } from './PopularCountryBrandsFilter';

const toastError = jest.fn();

jest.mock('@/lib/toast', () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (key === 'searchFilters.selectionLimitBrands') {
        return `Brand limit ${params?.max ?? ''}`;
      }
      const map: Record<string, string> = {
        'searchFilters.popularBrandsByCountry': 'Popular brands by country',
        'searchFilters.popularCountry.chinese': 'Chinese',
        'searchFilters.popularCountry.german': 'German',
      };
      return map[key] ?? key;
    },
  }),
}));

const brands: Brand[] = [
  { id: 'cn-1', name: 'Geely', order: 0, popular_country: 'chinese' },
  { id: 'cn-2', name: 'BYD', order: 1, popular_country: 'chinese' },
  { id: 'de-1', name: 'BMW', order: 2, popular_country: 'german' },
  { id: 'other', name: 'Other', order: 3 },
];

describe('PopularCountryBrandsFilter', () => {
  beforeEach(() => {
    toastError.mockClear();
  });

  it('renders nothing when no brands have a popular country', () => {
    const { container } = render(
      <PopularCountryBrandsFilter
        brands={[{ id: 'other', name: 'Other', order: 0 }]}
        selectedBrandIds={[]}
        onSelectionChange={jest.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders only countries with brands and adds missing brand ids on click', async () => {
    const onSelectionChange = jest.fn();

    render(
      <PopularCountryBrandsFilter
        brands={brands}
        selectedBrandIds={['cn-1']}
        onSelectionChange={onSelectionChange}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Popular brands by country')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Chinese \(\+2\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /German \(\+1\)/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Chinese \(\+2\)/ }));

    expect(onSelectionChange).toHaveBeenCalledWith(['cn-1', 'cn-2']);
  });

  it('removes country brands on repeat click when all are already selected', async () => {
    const onSelectionChange = jest.fn();

    render(
      <PopularCountryBrandsFilter
        brands={brands}
        selectedBrandIds={['cn-1', 'cn-2', 'de-1']}
        onSelectionChange={onSelectionChange}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Chinese \(\+2\)/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Chinese \(\+2\)/ }));

    expect(onSelectionChange).toHaveBeenCalledWith(['de-1']);
  });

  it('shows toast when brand selection limit is reached', async () => {
    const onSelectionChange = jest.fn();
    const selectedBrandIds = Array.from(
      { length: MAX_SEARCH_BRAND_SELECTIONS },
      (_, i) => `id-${i}`,
    );

    render(
      <PopularCountryBrandsFilter
        brands={brands}
        selectedBrandIds={selectedBrandIds}
        onSelectionChange={onSelectionChange}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Chinese \(\+2\)/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Chinese \(\+2\)/ }));

    expect(toastError).toHaveBeenCalledWith(`Brand limit ${MAX_SEARCH_BRAND_SELECTIONS}`);
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
