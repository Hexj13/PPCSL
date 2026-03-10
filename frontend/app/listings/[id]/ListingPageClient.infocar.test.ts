import type { Listing } from '@/lib/api';

import { getInfocarUrl, shouldShowInfocarSection } from './listingPageInfocar';

function listing(overrides: Partial<Listing> & { status: Listing['status'] }): Listing {
  return {
    id: 'listing-1',
    title: 'Test',
    price: 10000,
    currency: 'EUR',
    city: 'Chișinău',
    status: overrides.status,
    condition: 'Undamaged',
    registration_type: 'Local',
    horsepower: 100,
    last_updated_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  } as Listing;
}

describe('getInfocarUrl', () => {
  it('should return base URL with from=kupito when VIN is absent', () => {
    const listingWithoutVin = listing({ status: 'Active', vin: undefined });
    expect(getInfocarUrl(listingWithoutVin)).toBe('https://infocar.md/?from=kupito');
  });

  it('should return base URL when VIN is empty string', () => {
    const listingWithEmptyVin = listing({ status: 'Active', vin: '' });
    expect(getInfocarUrl(listingWithEmptyVin)).toBe('https://infocar.md/?from=kupito');
  });

  it('should return URL with encoded vin parameter when VIN is present', () => {
    const vin = 'WBA21FL020CV09474';
    const listingWithVin = listing({ status: 'Active', vin });
    const url = getInfocarUrl(listingWithVin);
    expect(url).toContain('from=kupito');
    expect(url).toContain('vin=' + encodeURIComponent(vin));
    expect(url).toBe('https://infocar.md/?from=kupito&vin=WBA21FL020CV09474');
  });

  it('should trim and encode VIN when it has leading/trailing spaces', () => {
    const listingWithSpaces = listing({ status: 'Active', vin: '  ABC123  ' });
    const url = getInfocarUrl(listingWithSpaces);
    expect(url).toContain('vin=' + encodeURIComponent('ABC123'));
  });

  it('should return base URL without vin when VIN is masked (4+9+4)', () => {
    const maskedVin = 'WBA2*********9474';
    const listingWithMaskedVin = listing({ status: 'Active', vin: maskedVin });
    const url = getInfocarUrl(listingWithMaskedVin);
    expect(url).toBe('https://infocar.md/?from=kupito');
    expect(url).not.toContain('vin=');
  });
});

describe('shouldShowInfocarSection', () => {
  it('should return true for Active listing with VIN', () => {
    expect(shouldShowInfocarSection(listing({ status: 'Active', vin: 'WBA21FL020CV09474' }))).toBe(
      true,
    );
  });

  it('should return true for Active listing without VIN', () => {
    expect(shouldShowInfocarSection(listing({ status: 'Active' }))).toBe(true);
  });

  it('should return false for Closed listing', () => {
    expect(shouldShowInfocarSection(listing({ status: 'Closed', vin: 'WBA21FL020CV09474' }))).toBe(
      false,
    );
  });

  it('should return false for Paused listing', () => {
    expect(shouldShowInfocarSection(listing({ status: 'Paused', vin: 'WBA21FL020CV09474' }))).toBe(
      false,
    );
  });
});
