/**
 * @jest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { useHeaderCatalogSuggest } from '@/hooks/useHeaderCatalogSuggest';
import type { CatalogSuggestItem } from '@/lib/search/header-catalog-suggest.types';

const replaceMock = jest.fn();
const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => ({
    toString: () => '',
  }),
}));

jest.mock('@/hooks/useLocalizedNavigation', () => ({
  useLocalizedNavigation: () => ({
    push: pushMock,
    replace: replaceMock,
    href: (path: string) => path,
  }),
}));

jest.mock('@/hooks/useHeaderCatalogSuggest', () => ({
  useHeaderCatalogSuggest: jest.fn(),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/lib/browser-session-storage', () => ({
  sessionStorageSetItem: jest.fn(),
}));

jest.mock('@/components/common/MultiSelectOptionLeadingLogo', () => ({
  MultiSelectOptionLeadingLogo: () => null,
}));

jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

import { HeaderCatalogSearch } from './HeaderCatalogSearch';
import { HEADER_CATALOG_SEARCH_MIN_WIDTH_PX } from './headerBreakpoints';

const suggestMock = useHeaderCatalogSuggest as jest.MockedFunction<typeof useHeaderCatalogSuggest>;

function mockMatchMedia(matches: (query: string) => boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: matches(query),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

function mockSheetViewport() {
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    writable: true,
    value: {
      height: 1024,
      offsetLeft: 0,
      offsetTop: 0,
      width: 820,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
  });
}

const yearItem: CatalogSuggestItem = {
  kind: 'brand_model_year',
  title: 'Ford Focus 2015',
  brandName: 'Ford',
  vehicleType: 'car',
  logoUrl: null,
  brandSlug: 'ford',
  modelSlug: 'focus',
  year: 2015,
};

describe('HeaderCatalogSearch', () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pushMock.mockReset();
    suggestMock.mockReturnValue({ items: [], isLoading: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not open the dropdown for fewer than 3 letters or digits', () => {
    render(<HeaderCatalogSearch variant="desktop" />);
    fireEvent.change(screen.getByTestId('header-catalog-search-input'), {
      target: { value: 'fo' },
    });
    expect(screen.queryByTestId('header-catalog-search-dropdown')).toBeNull();
  });

  it('applies year from and to together when a year row is selected', () => {
    jest.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    suggestMock.mockReturnValue({ items: [yearItem], isLoading: false });
    render(<HeaderCatalogSearch variant="desktop" />);
    fireEvent.change(screen.getByTestId('header-catalog-search-input'), {
      target: { value: 'ford' },
    });
    fireEvent.click(screen.getByTestId('header-catalog-search-item'));
    expect(replaceMock).toHaveBeenCalledWith(
      '/?brand=ford&model=focus&year_gte=2015&year_lte=2015',
      {
        scroll: false,
      },
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('uses the full catalog placeholder on desktop', () => {
    render(<HeaderCatalogSearch variant="desktop" />);
    expect(screen.getByTestId('header-catalog-search-input')).toHaveAttribute(
      'placeholder',
      'header.catalogSearchPlaceholder',
    );
  });

  it('matches the desktop dropdown to the input width with a 200px minimum', () => {
    suggestMock.mockReturnValue({ items: [yearItem], isLoading: false });
    render(<HeaderCatalogSearch variant="desktop" />);
    fireEvent.change(screen.getByTestId('header-catalog-search-input'), {
      target: { value: 'ford' },
    });
    const dropdown = screen.getByTestId('header-catalog-search-dropdown');
    expect(dropdown).toHaveClass('left-0');
    expect(dropdown).toHaveClass('w-full');
    expect(dropdown).toHaveStyle({ minWidth: `${HEADER_CATALOG_SEARCH_MIN_WIDTH_PX}px` });
  });

  it('notifies the header when desktop search becomes active and inactive', () => {
    const onDesktopActiveChange = jest.fn();
    render(<HeaderCatalogSearch variant="desktop" onDesktopActiveChange={onDesktopActiveChange} />);
    fireEvent.focus(screen.getByTestId('header-catalog-search-input'));
    expect(onDesktopActiveChange).toHaveBeenCalledWith(true);
    fireEvent.mouseDown(document.body);
    expect(onDesktopActiveChange).toHaveBeenCalledWith(false);
  });

  it('opens the bottom sheet on a tablet-width viewport', () => {
    mockSheetViewport();
    mockMatchMedia(() => false);
    render(<HeaderCatalogSearch variant="mobile" mobileOpen onMobileOpenChange={jest.fn()} />);
    expect(screen.getByTestId('header-catalog-search-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('header-catalog-search-input')).toHaveClass(
      'header-catalog-search-sheet-input',
    );
    expect(screen.getByTestId('header-catalog-search-input')).not.toHaveClass(
      'header-catalog-search-input',
    );
  });

  it('closes the mobile sheet when the viewport reaches desktop', () => {
    mockSheetViewport();
    mockMatchMedia((query) => query.includes('min-width') && query.includes('1024'));
    const onMobileOpenChange = jest.fn();
    render(
      <HeaderCatalogSearch variant="mobile" mobileOpen onMobileOpenChange={onMobileOpenChange} />,
    );
    expect(onMobileOpenChange).toHaveBeenCalledWith(false);
  });
});
