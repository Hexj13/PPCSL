import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { MobileSelectField } from './MobileSelectField';

jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'common.ok': 'OK',
        'common.search': 'Search',
        'common.requiredAsterisk': '*',
      })[key] ?? key,
  }),
}));

function mockDesktopViewport() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query.includes('min-width') && query.includes('768'),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

function mockMobileViewport() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query.includes('max-width') && query.includes('767'),
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

describe('MobileSelectField', () => {
  beforeEach(() => {
    mockMobileViewport();
    mockVisualViewport();
  });

  it('commits a mobile selection only after OK is clicked', async () => {
    const onChange = jest.fn();
    render(
      <MobileSelectField
        value=""
        onChange={onChange}
        options={[
          { value: 'toyota', label: 'Toyota' },
          { value: 'bmw', label: 'BMW' },
        ]}
        sheetTitle="Brand"
        placeholder="Select brand"
        dataTestId="listing-create-brand-select"
      />,
    );

    fireEvent.click(screen.getByTestId('listing-create-brand-select'));
    fireEvent.click(screen.getByRole('button', { name: 'Toyota' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('listing-create-brand-select')).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    expect(onChange).toHaveBeenCalledWith('toyota');
    await waitFor(() => {
      expect(screen.getByTestId('listing-create-brand-select')).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });
  });

  it('discards a draft mobile selection when the sheet is dismissed', async () => {
    const onChange = jest.fn();
    render(
      <MobileSelectField
        value=""
        onChange={onChange}
        options={[
          { value: 'toyota', label: 'Toyota' },
          { value: 'bmw', label: 'BMW' },
        ]}
        sheetTitle="Brand"
        placeholder="Select brand"
        dataTestId="listing-create-brand-select"
      />,
    );

    fireEvent.click(screen.getByTestId('listing-create-brand-select'));
    fireEvent.click(screen.getByRole('button', { name: 'Toyota' }));
    fireEvent.click(screen.getByTestId('bottom-sheet-backdrop'));

    await waitFor(() => {
      expect(screen.getByTestId('listing-create-brand-select')).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables other mobile options until the selected draft option is cleared', () => {
    render(
      <MobileSelectField
        value=""
        onChange={jest.fn()}
        options={[
          { value: 'toyota', label: 'Toyota' },
          { value: 'bmw', label: 'BMW' },
        ]}
        sheetTitle="Brand"
        placeholder="Select brand"
        dataTestId="listing-create-brand-select"
      />,
    );

    fireEvent.click(screen.getByTestId('listing-create-brand-select'));
    const toyotaOption = screen.getByRole('button', { name: 'Toyota' });
    const bmwOption = screen.getByRole('button', { name: 'BMW' });

    fireEvent.click(toyotaOption);

    expect(toyotaOption).not.toBeDisabled();
    expect(bmwOption).toBeDisabled();

    fireEvent.click(toyotaOption);

    expect(toyotaOption).not.toBeDisabled();
    expect(bmwOption).not.toBeDisabled();
  });

  it('keeps the bottom sheet height stable while search filters options', async () => {
    render(
      <MobileSelectField
        value=""
        onChange={jest.fn()}
        options={[
          { value: 'chisinau', label: 'Chișinău' },
          { value: 'balti', label: 'Bălți' },
          { value: 'cahul', label: 'Cahul' },
        ]}
        sheetTitle="City"
        searchable
        placeholder="Select city"
        dataTestId="listing-create-city-select"
      />,
    );

    fireEvent.click(screen.getByTestId('listing-create-city-select'));

    const dialog = screen.getByRole('dialog');
    const searchInput = screen.getByPlaceholderText('Search');

    expect(dialog).toHaveStyle({ height: '736px', maxHeight: '736px', minHeight: '704px' });
    expect(screen.getByText('Chișinău')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'zzzz' } });

    await waitFor(() => {
      expect(screen.getByText('searchFilters.noResults')).toBeInTheDocument();
    });

    expect(dialog).toHaveStyle({ height: '736px', maxHeight: '736px', minHeight: '704px' });
    expect(searchInput).toHaveValue('zzzz');
  });

  it('renders a desktop dropdown with floating label and required asterisk', () => {
    mockDesktopViewport();
    render(
      <MobileSelectField
        value="toyota"
        onChange={jest.fn()}
        options={[
          { value: 'toyota', label: 'Toyota' },
          { value: 'bmw', label: 'BMW' },
        ]}
        sheetTitle="Brand"
        requiredAsteriskFilled={true}
        placeholder="Select brand"
        dataTestId="listing-create-brand-select"
      />,
    );

    expect(screen.getByText('Brand')).toBeInTheDocument();
    expect(screen.getByText('Toyota')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByTestId('listing-create-brand-select')).toHaveClass('search-control-border');
  });

  it('uses search-control-border on the mobile trigger', () => {
    render(
      <MobileSelectField
        value=""
        onChange={jest.fn()}
        options={[{ value: 'toyota', label: 'Toyota' }]}
        sheetTitle="Brand"
        placeholder="Select brand"
        dataTestId="listing-create-brand-select"
      />,
    );

    expect(screen.getByTestId('listing-create-brand-select')).toHaveClass('search-control-border');
  });
});
