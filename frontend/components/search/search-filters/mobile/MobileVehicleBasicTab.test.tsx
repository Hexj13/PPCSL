import { fireEvent, render, screen } from '@testing-library/react';

import { MobileVehicleBasicTab } from './MobileVehicleBasicTab';
import type { MobileTranslateFn } from './mobile-search-filters-utils';

jest.mock('@/lib/site-config', () => ({
  loadSiteConfigSync: () => ({ currency: 'EUR' }),
}));

const translations: Record<string, string> = {
  'searchFilters.brand': 'Brand',
  'searchFilters.model': 'Model',
  'searchFilters.year': 'Year',
  'searchFilters.priceWithSearchCurrency': 'Price ({currency})',
  'searchFilters.fuel': 'Fuel',
  'searchFilters.body': 'Body',
  'searchFilters.transmission': 'Transmission',
  'searchFilters.drive': 'Drive',
  'searchFilters.mileage': 'Mileage',
  'searchFilters.showMore': 'Show more',
  'searchFilters.showLess': 'Show less',
};

const t: MobileTranslateFn = (key, params) => {
  const s = translations[key] ?? key;
  if (!params) {
    return s;
  }
  return Object.entries(params).reduce((acc, [name, value]) => {
    return acc.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
  }, s);
};

const defaultProps = {
  t,
  filters: {
    brand_ids: [] as string[],
    model_ids: [] as string[],
    year_gte: '',
    year_lte: '',
    price_gte: '',
    price_lte: '',
  },
  loadingModels: false,
  brandSummary: '',
  modelSummary: '',
  yearSummary: '',
  fuelSummary: '',
  bodySummary: '',
  priceSummary: '',
  transmissionSummary: '',
  driveSummary: '',
  mileageSummary: '',
  openSheetForEdit: jest.fn(),
};

function filterRowIds(): string[] {
  return screen
    .getAllByTestId(/^search-filter-row-/)
    .map((node) => node.getAttribute('data-testid') ?? '');
}

describe('MobileVehicleBasicTab', () => {
  beforeEach(() => {
    defaultProps.openSheetForEdit.mockReset();
  });

  it('renders visible rows in brand, model, year, price order', () => {
    render(<MobileVehicleBasicTab {...defaultProps} />);

    expect(filterRowIds().slice(0, 4)).toEqual([
      'search-filter-row-vehicle_brand',
      'search-filter-row-vehicle_model',
      'search-filter-row-vehicle_year',
      'search-filter-row-vehicle_price',
    ]);
  });

  it('keeps extra rows collapsed behind Show more', () => {
    render(<MobileVehicleBasicTab {...defaultProps} />);

    const toggle = screen.getByTestId('search-basic-more-toggle');
    const content = screen.getByTestId('search-basic-more-content');

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveTextContent('Show more');
    expect(toggle).toHaveClass('text-primary-700');
    expect(toggle).not.toHaveClass('search-control-border');
    expect(content).toHaveClass('grid-rows-[0fr]');
    expect(screen.queryByTestId('search-basic-more-fade')).not.toBeInTheDocument();
    expect(screen.queryByTestId('search-basic-more-active')).not.toBeInTheDocument();
    expect(content).toContainElement(screen.getByTestId('search-filter-row-vehicle_fuel'));
    expect(content).toContainElement(screen.getByTestId('search-filter-row-vehicle_body'));
    expect(content).toContainElement(screen.getByTestId('search-filter-row-vehicle_transmission'));
    expect(content).toContainElement(screen.getByTestId('search-filter-row-vehicle_drive'));
    expect(content).toContainElement(screen.getByTestId('search-filter-row-vehicle_mileage'));
  });

  it('expands extra rows on Show more and collapses on Show less', () => {
    render(<MobileVehicleBasicTab {...defaultProps} />);

    const toggle = screen.getByTestId('search-basic-more-toggle');
    const content = screen.getByTestId('search-basic-more-content');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveTextContent('Show less');
    expect(content).toHaveClass('grid-rows-[1fr]');
    expect(content).toHaveClass('mb-3');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveTextContent('Show more');
    expect(content).toHaveClass('grid-rows-[0fr]');
    expect(content).not.toHaveClass('mb-3');
  });

  it('shows a collapsed accent indicator when an extra filter has a value', () => {
    render(<MobileVehicleBasicTab {...defaultProps} fuelSummary="Petrol" />);

    const toggle = screen.getByTestId('search-basic-more-toggle');
    const indicator = screen.getByTestId('search-basic-more-active');

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(indicator).toHaveClass('bg-accent', 'h-1.5', 'w-1.5');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByTestId('search-basic-more-active')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(screen.getByTestId('search-basic-more-active')).toBeInTheDocument();
  });
});
