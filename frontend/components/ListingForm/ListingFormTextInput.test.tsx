import { fireEvent, render, screen } from '@testing-library/react';

import { ListingFormTextInput } from './ListingFormTextInput';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'common.clear': 'Clear',
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
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

describe('ListingFormTextInput', () => {
  it('renders SearchFilterInput on desktop', () => {
    mockDesktopViewport();
    render(
      <ListingFormTextInput
        value="1000"
        onChange={jest.fn()}
        fieldLabel="Price"
        dataTestId="listing-form-price"
      />,
    );

    expect(screen.getByTestId('listing-form-price')).toBeInTheDocument();
    expect(screen.getByTitle('Price')).toHaveClass('is-floating');
  });

  it('renders a plain input with search-control-border on mobile', () => {
    mockMobileViewport();
    render(
      <ListingFormTextInput
        value="1000"
        onChange={jest.fn()}
        fieldLabel="Price"
        dataTestId="listing-form-price"
      />,
    );

    const input = screen.getByTestId('listing-form-price');
    expect(input).toHaveClass('search-control-border');
    expect(input).toHaveAttribute('aria-label', 'Price');
    expect(screen.queryByTitle('Price')).not.toBeInTheDocument();
  });

  it('forwards onChange on mobile', () => {
    mockMobileViewport();
    const onChange = jest.fn();
    render(
      <ListingFormTextInput value="" onChange={onChange} fieldLabel="Price" dataTestId="price" />,
    );

    fireEvent.change(screen.getByTestId('price'), { target: { value: '42' } });
    expect(onChange).toHaveBeenCalledWith('42');
  });

  it('shows a clear button when the value is non-empty and clears on click', () => {
    mockMobileViewport();
    const onChange = jest.fn();
    render(
      <ListingFormTextInput
        value="ABC"
        onChange={onChange}
        fieldLabel="VIN"
        dataTestId="listing-create-vin-input"
      />,
    );

    expect(screen.getByTestId('listing-create-vin-input-clear')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('listing-create-vin-input-clear'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('hides the clear button when the value is empty', () => {
    mockMobileViewport();
    render(
      <ListingFormTextInput
        value=""
        onChange={jest.fn()}
        fieldLabel="VIN"
        dataTestId="listing-create-vin-input"
      />,
    );

    expect(screen.queryByTestId('listing-create-vin-input-clear')).not.toBeInTheDocument();
  });
});
