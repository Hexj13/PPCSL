import { render, screen } from '@testing-library/react';
import React from 'react';

import { SearchFormActions } from './SearchFormActions';

jest.mock('../SortDropdown', () => ({
  SortDropdown: () => null,
}));

jest.mock('@/components/listing/ListingViewModeToggle', () => ({
  ListingViewModeToggle: () => null,
}));

jest.mock('@/components/search/SavedFiltersList', () => ({
  isSavedFiltersLimitReached: () => false,
  resolveSavedFiltersCount: async () => 0,
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/hooks/useLocalizedNavigation', () => ({
  useLocalizedNavigation: () => ({ push: jest.fn() }),
}));

jest.mock('@/lib/store', () => ({
  useAuthStore: () => ({ user: null, isInitialized: true }),
}));

jest.mock('@/lib/toast', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

describe('SearchFormActions', () => {
  it('hides the search submit button below the xl breakpoint', () => {
    render(
      <SearchFormActions
        onReset={jest.fn()}
        onSaveClick={jest.fn()}
        hasFiltersChanged
        isSyncingFromUrl={false}
        showSearchLoader={false}
        hasActiveFilters
        canSaveFilter
        availableListingsTotal={0}
        isAvailableListingsLoading={false}
        buttonsContainerRef={{ current: null }}
      />,
    );

    const wrap = screen.getByTestId('search-submit-wrap');
    expect(wrap).toHaveClass('hidden');
    expect(wrap).toHaveClass('xl:contents');
    expect(screen.getByTestId('search-submit')).toBeInTheDocument();
  });
});
