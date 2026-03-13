import { render, screen } from '@testing-library/react';

import type { Listing } from '@/lib/api';

import { ListingPageBreadcrumbs } from './ListingPageBreadcrumbs';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'breadcrumbs.transport': 'Transport',
        'breadcrumbs.ariaLabel': 'Breadcrumb',
        'vehicleOptions.transmission.Automatic': 'Automatic',
        'vehicleOptions.transmission.Manual': 'Manual',
      })[key] ?? key,
  }),
}));

function createListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'listing-1',
    title: 'Test',
    city: 'Chisinau',
    status: 'Active',
    condition: 'Used',
    registration_type: 'Registered',
    horsepower: 100,
    last_updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    vehicle: {
      id: 'v1',
      brand_id: 'b1',
      model_id: 'm1',
      year: 2020,
      transmission: 'Automatic',
      body_type: 'Sedan',
      brand: { id: 'b1', name: 'Citroën', order: 0 },
      model: { id: 'm1', name: 'C4', brand_id: 'b1', order: 0, vehicle_types: ['car'] },
    },
    ...overrides,
  } as Listing;
}

describe('ListingPageBreadcrumbs', () => {
  it('renders Transport, Transmission, Brand, Model for car with full vehicle data', () => {
    const listing = createListing();
    render(<ListingPageBreadcrumbs listing={listing} />);
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText('Automatic')).toBeInTheDocument();
    expect(screen.getByText('Citroën')).toBeInTheDocument();
    expect(screen.getByText('C4')).toBeInTheDocument();
    const transportLink = screen.getByRole('link', { name: 'Transport' });
    expect(transportLink).toHaveAttribute('href', '/');
    const transmissionLink = screen.getByRole('link', { name: 'Automatic' });
    expect(transmissionLink).toHaveAttribute('href', '/?transmissions=Automatic');
    const brandLink = screen.getByRole('link', { name: 'Citroën' });
    expect(brandLink).toHaveAttribute('href', '/?brand=citroen');
    const modelLink = screen.getByRole('link', { name: 'C4' });
    expect(modelLink).toHaveAttribute('href', '/?brand=citroen&model=c4');
  });

  it('omits transmission segment when transmission is missing', () => {
    const listing = createListing({
      vehicle: {
        id: 'v1',
        brand_id: 'b1',
        model_id: 'm1',
        year: 2020,
        body_type: 'Sedan',
        brand: { id: 'b1', name: 'Honda', order: 0 },
        model: {
          id: 'm1',
          name: 'CBR',
          brand_id: 'b1',
          order: 0,
          vehicle_types: ['moto'],
        },
      },
    });
    render(<ListingPageBreadcrumbs listing={listing} />);
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.queryByText('Manual')).not.toBeInTheDocument();
    expect(screen.getByText('Honda')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Honda' })).toHaveAttribute(
      'href',
      '/?vehicleType=moto&brand=honda',
    );
  });

  it('adds vehicleType for truck in brand and model links', () => {
    const listing = createListing({
      vehicle: {
        id: 'v1',
        brand_id: 'b1',
        model_id: 'm1',
        year: 2020,
        transmission: 'Manual',
        body_type: 'SUV',
        brand: { id: 'b1', name: 'Ford', order: 0 },
        model: {
          id: 'm1',
          name: 'Ranger',
          brand_id: 'b1',
          order: 0,
          vehicle_types: ['truck'],
        },
      },
    });
    render(<ListingPageBreadcrumbs listing={listing} />);
    expect(screen.getByRole('link', { name: 'Ford' })).toHaveAttribute(
      'href',
      '/?vehicleType=truck&brand=ford',
    );
    expect(screen.getByRole('link', { name: 'Ranger' })).toHaveAttribute(
      'href',
      '/?vehicleType=truck&brand=ford&model=ranger',
    );
  });

  it('returns null when listing has no vehicle or only transport', () => {
    const listingNoVehicle = createListing({ vehicle: undefined });
    render(<ListingPageBreadcrumbs listing={listingNoVehicle} />);
    expect(screen.queryByLabelText('Breadcrumb')).not.toBeInTheDocument();
  });
});
