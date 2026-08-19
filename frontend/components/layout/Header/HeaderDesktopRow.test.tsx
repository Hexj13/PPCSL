/**
 * @jest-environment jsdom
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/components/common/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));

jest.mock('./DesktopNav', () => ({
  DesktopNavMenuArea: () => <div data-testid="desktop-menu-area" />,
  DesktopNavActions: () => <div data-testid="desktop-actions" />,
}));

jest.mock('./HeaderCatalogSearch', () => ({
  HeaderCatalogSearch: ({
    onDesktopActiveChange,
  }: {
    onDesktopActiveChange?: (active: boolean) => void;
  }) => (
    <>
      <input
        data-testid="header-catalog-search-input"
        onFocus={() => onDesktopActiveChange?.(true)}
      />
      <button
        type="button"
        data-testid="header-catalog-search-activate"
        onClick={() => onDesktopActiveChange?.(true)}
      />
      <button
        type="button"
        data-testid="header-catalog-search-deactivate"
        onClick={() => onDesktopActiveChange?.(false)}
      />
    </>
  ),
}));

import { HeaderDesktopRow } from './HeaderDesktopRow';
import { HEADER_CATALOG_SEARCH_MIN_WIDTH_PX } from './headerBreakpoints';

const baseProps = {
  user: null,
  showNav: true,
  showMenuSlot: true,
  showActionsSlot: true,
  showCatalogSearch: true,
  showDesktopLanguage: true,
  isSignPage: false,
  comparisonCount: 0,
  navLinkClasses: '',
  onLogout: jest.fn(),
  onSetReturnUrl: jest.fn(),
  t: (key: string) => key,
};

function mockSearchSlotWidth(width: number) {
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const resolved = this.getAttribute('data-testid') === 'header-catalog-search-slot' ? width : 0;
    return {
      width: resolved,
      height: 40,
      top: 0,
      left: 0,
      bottom: 40,
      right: resolved,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
  });
}

function navCluster() {
  return screen.getByTestId('header-desktop-nav-cluster');
}

function navClusterPanel() {
  return screen.getByTestId('header-desktop-nav-cluster-panel');
}

describe('HeaderDesktopRow', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('covers catalog search with a skeleton while the header is loading', () => {
    render(<HeaderDesktopRow {...baseProps} showSkeleton />);

    expect(screen.getByTestId('header-catalog-search-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('header-catalog-search-slot')).toHaveClass('flex-1');
    expect(screen.queryByTestId('header-catalog-search-input')).toBeNull();
    expect(navCluster()).toHaveStyle({ gridTemplateColumns: '1fr' });
  });

  it('shows the catalog search field after the header finishes loading', () => {
    render(<HeaderDesktopRow {...baseProps} showSkeleton={false} />);

    expect(screen.getByTestId('header-catalog-search-input')).toBeInTheDocument();
    expect(screen.queryByTestId('header-catalog-search-skeleton')).toBeNull();
    expect(navClusterPanel()).toHaveClass('overflow-visible');
  });

  it('hides nav links when the search slot is narrower than 200px on focus', () => {
    mockSearchSlotWidth(HEADER_CATALOG_SEARCH_MIN_WIDTH_PX - 1);
    render(<HeaderDesktopRow {...baseProps} showSkeleton={false} />);

    fireEvent.focus(screen.getByTestId('header-catalog-search-input'));

    expect(navCluster()).toHaveAttribute('aria-hidden', 'true');
    expect(navCluster()).toHaveAttribute('inert');
    expect(navCluster()).toHaveStyle({ gridTemplateColumns: '0fr' });
    expect(navClusterPanel()).toHaveClass('overflow-hidden');
  });

  it('keeps nav links when the search slot is already 200px wide', () => {
    mockSearchSlotWidth(HEADER_CATALOG_SEARCH_MIN_WIDTH_PX);
    render(<HeaderDesktopRow {...baseProps} showSkeleton={false} />);

    fireEvent.focus(screen.getByTestId('header-catalog-search-input'));

    expect(navCluster()).toHaveAttribute('aria-hidden', 'false');
    expect(navCluster()).not.toHaveAttribute('inert');
    expect(navCluster()).toHaveStyle({ gridTemplateColumns: '1fr' });
    expect(navClusterPanel()).toHaveClass('overflow-visible');
  });

  it('does not restore nav after expand just because the slot is now wider', () => {
    mockSearchSlotWidth(HEADER_CATALOG_SEARCH_MIN_WIDTH_PX - 1);
    render(<HeaderDesktopRow {...baseProps} showSkeleton={false} />);
    fireEvent.focus(screen.getByTestId('header-catalog-search-input'));

    mockSearchSlotWidth(400);
    fireEvent.click(screen.getByTestId('header-catalog-search-activate'));

    expect(navCluster()).toHaveStyle({ gridTemplateColumns: '0fr' });
  });

  it('restores nav links when desktop search becomes inactive', () => {
    mockSearchSlotWidth(HEADER_CATALOG_SEARCH_MIN_WIDTH_PX - 1);
    render(<HeaderDesktopRow {...baseProps} showSkeleton={false} />);
    fireEvent.focus(screen.getByTestId('header-catalog-search-input'));

    fireEvent.click(screen.getByTestId('header-catalog-search-deactivate'));

    expect(navCluster()).toHaveStyle({ gridTemplateColumns: '1fr' });
    expect(navCluster()).toHaveAttribute('aria-hidden', 'false');
    expect(navClusterPanel()).toHaveClass('overflow-visible');
  });
});
