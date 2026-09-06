import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { COMPACT_LAYOUT_MAX_WIDTH_PX } from '@/lib/layout-breakpoints';

import { SortDropdown } from './SortDropdown';

jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => ({
    get: () => null,
    toString: () => '',
  }),
}));

jest.mock('@/components/providers/I18nProvider', () => ({
  useI18n: () => ({ locale: 'en' }),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'common.ok': 'OK',
        'common.close': 'Close',
        'common.sortingLabel': 'Sort',
        'common.selectSorting': 'Select sorting',
        'common.sorting.newestFirst': 'Newest first',
        'common.sorting.oldestFirst': 'Oldest first',
        'common.sorting.popular': 'Popular',
        'common.sorting.priceAscending': 'Price ascending',
        'common.sorting.priceDescending': 'Price descending',
        'common.sorting.yearDescending': 'Year descending',
        'common.sorting.yearAscending': 'Year ascending',
      })[key] ?? key,
  }),
}));

function mockMobileViewport() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches:
        query.includes('max-width') &&
        (query.includes('767') || query.includes(String(COMPACT_LAYOUT_MAX_WIDTH_PX))),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

function mockVisualViewport() {
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    writable: true,
    value: {
      height: 800,
      offsetLeft: 0,
      offsetTop: 0,
      width: 390,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
  });
}

describe('SortDropdown', () => {
  beforeEach(() => {
    mockMobileViewport();
    mockVisualViewport();
  });

  it('commits mobile sort through the bottom sheet after OK', async () => {
    const onSortChange = jest.fn();
    render(<SortDropdown selectedSortKey="created_at_DESC" onSortChange={onSortChange} />);

    const trigger = await screen.findByTestId('search-sort-select');
    await waitFor(() => {
      expect(trigger).toBeEnabled();
    });

    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(trigger).getByTestId('search-sort-icon')).toBeInTheDocument();
    expect(
      within(screen.getByRole('heading', { name: 'Sort' })).getByTestId('search-sort-icon'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('search-sort-select-option-3'));
    expect(onSortChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('search-sort-select-confirm'));
    expect(onSortChange).toHaveBeenCalledWith('price', 'ASC');
  });
});
