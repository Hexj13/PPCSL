/**
 * @jest-environment jsdom
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, screen } from '@testing-library/react';

import type { CatalogSuggestItem } from '@/lib/search/header-catalog-suggest.types';

import { HeaderCatalogSuggestList } from './HeaderCatalogSuggestList';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'header.catalogSearchYearWithValue') {
        return `Year: ${params?.year ?? ''}`;
      }
      return key;
    },
  }),
}));

jest.mock('@/components/common/MultiSelectOptionLeadingLogo', () => ({
  MultiSelectOptionLeadingLogo: () => <span data-testid="suggest-logo" />,
}));

const fordItem: CatalogSuggestItem = {
  kind: 'brand',
  title: 'Ford',
  brandName: 'Ford',
  vehicleType: 'car',
  logoUrl: null,
  brandSlug: 'ford',
  modelSlug: null,
  year: null,
};

describe('HeaderCatalogSuggestList', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the deferred loader while a suggest request is in flight', () => {
    jest.useFakeTimers();
    render(
      <HeaderCatalogSuggestList
        items={[]}
        isLoading
        activeIndex={0}
        listId="suggest-list"
        onHover={jest.fn()}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('header-catalog-search-loading')).toBeNull();
    expect(screen.queryByTestId('header-catalog-search-item')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.getByTestId('header-catalog-search-loading')).toBeInTheDocument();
  });

  it('renders suggestion rows after loading finishes', () => {
    render(
      <HeaderCatalogSuggestList
        items={[fordItem]}
        isLoading={false}
        activeIndex={0}
        listId="suggest-list"
        onHover={jest.fn()}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByTestId('header-catalog-search-item')).toHaveTextContent('Ford');
    expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('listbox')).not.toHaveClass('py-1');
  });

  it('shows the queried year on the same line as the category', () => {
    render(
      <HeaderCatalogSuggestList
        items={[{ ...fordItem, year: 2016 }]}
        isLoading={false}
        activeIndex={0}
        listId="suggest-list"
        onHover={jest.fn()}
        onSelect={jest.fn()}
      />,
    );

    const row = screen.getByTestId('header-catalog-search-item');
    expect(row).toHaveTextContent('Ford');
    expect(row).toHaveTextContent('Year: 2016');
  });
});
