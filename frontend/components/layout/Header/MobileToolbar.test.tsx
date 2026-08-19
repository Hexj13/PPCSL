/**
 * @jest-environment jsdom
 */

import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/listing/CreateListingButton', () => ({
  CreateListingButton: () => <button type="button" data-testid="create-listing" />,
}));

import { MobileToolbar } from './MobileToolbar';

const baseProps = {
  isMobileMenuOpen: false,
  isDrawerVisible: false,
  onToggle: jest.fn(),
  toggleAriaLabel: 'Menu',
  toggleId: 'menu-toggle',
  drawerId: 'drawer',
  catalogSearchAriaLabel: 'Search',
  onOpenCatalogSearch: jest.fn(),
  showCatalogSearch: true,
};

describe('MobileToolbar', () => {
  it('covers the search icon with a skeleton while the header is loading', () => {
    render(<MobileToolbar {...baseProps} showSkeleton />);

    expect(screen.getByTestId('header-mobile-search-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('header-mobile-search')).toBeNull();
  });

  it('shows the search icon after the header finishes loading', () => {
    render(<MobileToolbar {...baseProps} showSkeleton={false} />);

    expect(screen.getByTestId('header-mobile-search')).toBeInTheDocument();
    expect(screen.queryByTestId('header-mobile-search-skeleton')).toBeNull();
  });
});
