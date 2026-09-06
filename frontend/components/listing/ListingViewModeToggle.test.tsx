/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';

import { LISTING_VIEW_MODE_STORAGE_KEY, setListingViewMode } from '@/lib/listing-view-mode';

import { ListingViewModeToggle } from './ListingViewModeToggle';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('ListingViewModeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setListingViewMode('large');
  });

  it('marks large as pressed by default', () => {
    render(<ListingViewModeToggle />);
    expect(screen.getByTestId('listing-view-mode-large')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('listing-view-mode-compact')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByTestId('listing-view-mode-large')).toHaveTextContent(
      'listings.viewModeLarge',
    );
    expect(screen.getByTestId('listing-view-mode-compact')).toHaveTextContent(
      'listings.viewModeCompact',
    );
  });

  it('switches to compact and persists the choice', () => {
    render(<ListingViewModeToggle />);
    fireEvent.click(screen.getByTestId('listing-view-mode-compact'));
    expect(screen.getByTestId('listing-view-mode-compact')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('listing-view-mode-large')).toHaveAttribute('aria-pressed', 'false');
    expect(window.localStorage.getItem(LISTING_VIEW_MODE_STORAGE_KEY)).toBe('compact');
  });
});
