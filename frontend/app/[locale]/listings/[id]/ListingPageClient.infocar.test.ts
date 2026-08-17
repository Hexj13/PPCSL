import type { Listing } from '@/lib/api';
import { loadSiteConfigSync } from '@/lib/site-config';

import { getReportUrl, shouldShowReportSection } from './listingPageReports';

jest.mock('@/lib/site-config', () => ({
  loadSiteConfigSync: jest.fn(),
}));

const mockedLoadSiteConfigSync = jest.mocked(loadSiteConfigSync);

const reportProvider = {
  baseUrls: {
    ro: 'https://infocar.md',
    ru: 'https://ru.infocar.md',
  },
  demoUrls: {
    ro: 'https://infocar.md/demo?from=kupito',
    ru: 'https://ru.infocar.md/demo?from=kupito',
  },
  partnerFrom: 'kupito',
};

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

beforeEach(() => {
  mockedLoadSiteConfigSync.mockReturnValue({
    reportProvider,
  } as never);
});

describe('getReportUrl', () => {
  it('should return RO base URL with from=kupito when VIN is absent', () => {
    const listingWithoutVin = listing({ status: 'Active', vin: undefined });
    expect(getReportUrl(listingWithoutVin, 'ro')).toBe('https://infocar.md?from=kupito');
  });

  it('should return RU base URL when VIN is absent and locale is ru', () => {
    const listingWithoutVin = listing({ status: 'Active', vin: undefined });
    expect(getReportUrl(listingWithoutVin, 'ru')).toBe('https://ru.infocar.md?from=kupito');
  });

  it('should return base URL when VIN is empty string', () => {
    const listingWithEmptyVin = listing({ status: 'Active', vin: '' });
    expect(getReportUrl(listingWithEmptyVin, 'ro')).toBe('https://infocar.md?from=kupito');
  });

  it('should return URL with encoded vin parameter when VIN is present (RO)', () => {
    const vin = 'WBA21FL020CV09474';
    const listingWithVin = listing({ status: 'Active', vin });
    const url = getReportUrl(listingWithVin, 'ro');
    expect(url).toContain('from=kupito');
    expect(url).toContain('vin=' + encodeURIComponent(vin));
    expect(url).toBe('https://infocar.md?from=kupito&vin=WBA21FL020CV09474');
  });

  it('should return URL with encoded vin parameter when VIN is present (RU)', () => {
    const vin = 'WBA21FL020CV09474';
    const listingWithVin = listing({ status: 'Active', vin });
    const url = getReportUrl(listingWithVin, 'ru');
    expect(url).toContain('from=kupito');
    expect(url).toContain('vin=' + encodeURIComponent(vin));
    expect(url).toBe('https://ru.infocar.md?from=kupito&vin=WBA21FL020CV09474');
  });

  it('should default to RO when locale is omitted', () => {
    const listingWithVin = listing({ status: 'Active', vin: 'ABC123' });
    expect(getReportUrl(listingWithVin)).toBe('https://infocar.md?from=kupito&vin=ABC123');
  });

  it('should trim and encode VIN when it has leading/trailing spaces', () => {
    const listingWithSpaces = listing({ status: 'Active', vin: '  ABC123  ' });
    const url = getReportUrl(listingWithSpaces, 'ro');
    expect(url).toContain('vin=' + encodeURIComponent('ABC123'));
  });

  it('should return base URL without vin when VIN is masked (4+9+4)', () => {
    const maskedVin = 'WBA2*********9474';
    const listingWithMaskedVin = listing({ status: 'Active', vin: maskedVin });
    const url = getReportUrl(listingWithMaskedVin, 'ro');
    expect(url).toBe('https://infocar.md?from=kupito');
    expect(url).not.toContain('vin=');
  });

  it('should return null when report provider is not configured', () => {
    mockedLoadSiteConfigSync.mockReturnValue({} as never);
    const listingWithVin = listing({ status: 'Active', vin: 'ABC123' });
    expect(getReportUrl(listingWithVin, 'ro')).toBeNull();
  });
});

describe('shouldShowReportSection', () => {
  it('should return true for Active listing with VIN', () => {
    expect(shouldShowReportSection(listing({ status: 'Active', vin: 'WBA21FL020CV09474' }))).toBe(
      true,
    );
  });

  it('should return true for Active listing without VIN', () => {
    expect(shouldShowReportSection(listing({ status: 'Active' }))).toBe(true);
  });

  it('should return false for Closed listing', () => {
    expect(shouldShowReportSection(listing({ status: 'Closed', vin: 'WBA21FL020CV09474' }))).toBe(
      false,
    );
  });

  it('should return false for Paused listing', () => {
    expect(shouldShowReportSection(listing({ status: 'Paused', vin: 'WBA21FL020CV09474' }))).toBe(
      false,
    );
  });

  it('should return false when provider is not configured', () => {
    mockedLoadSiteConfigSync.mockReturnValue({} as never);
    expect(shouldShowReportSection(listing({ status: 'Active', vin: 'WBA21FL020CV09474' }))).toBe(
      false,
    );
  });

  it('should return true for Active listing when only en URLs are configured', () => {
    mockedLoadSiteConfigSync.mockReturnValue({
      reportProvider: {
        baseUrls: { en: 'https://www.carvertical.com/en' },
        demoUrls: { en: 'https://www.carvertical.com/en/sample-report' },
      },
    } as never);
    expect(shouldShowReportSection(listing({ status: 'Active' }))).toBe(true);
  });
});

describe('carVertical report URLs', () => {
  const carVerticalProvider = {
    baseUrls: {
      en: 'https://www.carvertical.com/en',
      sq: 'https://www.carvertical.com/en',
    },
    demoUrls: {
      en: 'https://www.carvertical.com/en/sample-report',
      sq: 'https://www.carvertical.com/en/sample-report',
    },
  };

  beforeEach(() => {
    mockedLoadSiteConfigSync.mockReturnValue({
      reportProvider: carVerticalProvider,
    } as never);
  });

  it('should append plaintext VIN without an affiliate param', () => {
    const listingWithVin = listing({ status: 'Active', vin: 'WBA21FL020CV09474' });
    expect(getReportUrl(listingWithVin, 'en')).toBe(
      'https://www.carvertical.com/en?vin=WBA21FL020CV09474',
    );
    expect(getReportUrl(listingWithVin, 'sq')).toBe(
      'https://www.carvertical.com/en?vin=WBA21FL020CV09474',
    );
  });

  it('should fall back to en URLs when locale keys are missing', () => {
    mockedLoadSiteConfigSync.mockReturnValue({
      reportProvider: {
        baseUrls: { en: 'https://www.carvertical.com/en' },
        demoUrls: { en: 'https://www.carvertical.com/en/sample-report' },
      },
    } as never);
    const listingWithVin = listing({ status: 'Active', vin: 'ABC123' });
    expect(getReportUrl(listingWithVin, 'sq')).toBe('https://www.carvertical.com/en?vin=ABC123');
  });

  it('should omit vin when it is absent', () => {
    expect(getReportUrl(listing({ status: 'Active' }), 'en')).toBe(
      'https://www.carvertical.com/en',
    );
  });
});
