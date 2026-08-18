import {
  buildHomeBrandTitle,
  buildHomeCategoryTitle,
  buildListingSeoTitle,
} from './listing-seo-title';
import {
  createSlug,
  formatAdminTableDateTime,
  formatBodyType,
  formatDate,
  formatDateLong,
  formatDateShort,
  formatEngineVolume,
  formatFuel,
  formatMileage,
  formatPrice,
  formatThousandsWithSpaces,
  formatTransmission,
  getCityName,
  getCityNamePlain,
  getListingDisplayTitle,
  getTireModelDisplayLabel,
  horsepowerToKw,
  kwToHorsepower,
  slugMatches,
} from './utils';

jest.mock('../site-config', () => ({
  loadSiteConfigSync: jest.fn(() => ({
    locale: 'en-US',
    currency: 'EUR',
  })),
}));

const mockT = (key: string): string => {
  const translations: Record<string, string> = {
    'vehicleOptions.transmission.Manual': 'Manual',
    'vehicleOptions.transmission.Automatic': 'Automatic',
    'vehicleOptions.transmission.CVT': 'CVT',
    'vehicleOptions.transmission.Robot': 'Robot',
    'vehicleOptions.driveType.FWD': 'Front',
    'vehicleOptions.driveType.RWD': 'Rear',
    'vehicleOptions.driveType.AWD': 'AWD',
    'vehicleOptions.bodyType.Sedan': 'Sedan',
    'vehicleOptions.bodyType.Hatchback': 'Hatchback',
    'vehicleOptions.bodyType.Wagon': 'Wagon',
    'vehicleOptions.bodyType.SUV': 'SUV',
    'vehicleOptions.bodyType.Coupe': 'Coupe',
    'vehicleOptions.bodyType.Convertible': 'Convertible',
    'vehicleOptions.bodyType.Van': 'Van',
    'vehicleOptions.bodyType.Pickup': 'Pickup',
    'vehicleOptions.bodyType.Minivan': 'Minivan',
    'vehicleOptions.bodyType.Truck': 'Truck',
    'vehicleOptions.fuel.Petrol': 'Petrol',
    'vehicleOptions.fuel.Diesel': 'Diesel',
    'vehicleOptions.fuel.Electric': 'Electric',
    'vehicleOptions.fuel.Hybrid': 'Hybrid',
    'vehicleOptions.fuel.MHEV': 'Hybrid (MHEV)',
    'vehicleOptions.fuel.PHEV': 'Hybrid (PHEV)',
    'vehicleOptions.fuel.LPG': 'LPG',
  };
  return translations[key] || key;
};

const seoMockT = (key: string): string => {
  const translations: Record<string, string> = {
    'metadata.listing.titlePrefix': 'Buy',
    'metadata.listing.powerUnit': 'hp',
    'metadata.listing.inCity': 'in',
    'metadata.listing.yearFormat': '{year}',
    'metadata.listing.pricePrefix': 'priced at',
    'metadata.listing.siteSuffix': 'on Kupito.club',
    'metadata.site.homeTitleTemplate': 'Kupito.club: buy and sell {category} in Moldova',
    'metadata.site.homeBrandTitleTemplate': 'Buy or sell {value} in Moldova on Kupito.club',
    'metadata.site.categoryTitle.car': 'cars',
    'metadata.site.categoryTitle.truck': 'commercial vehicles',
    'metadata.site.categoryTitle.moto': 'motorcycles',
    'metadata.site.categoryTitle.tire': 'tires and wheels',
    'vehicleOptions.transmission.Automatic': 'Automatic',
    'vehicleOptions.fuel.Diesel': 'Diesel',
    'vehicleOptions.bodyType.Minivan': 'Minivan',
  };
  return translations[key] || key;
};

describe('utils', () => {
  describe('formatPrice', () => {
    it('should format price correctly', () => {
      expect(formatPrice(10000)).toBe('10 000');
      expect(formatPrice(1234567)).toBe('1 234 567');
      expect(formatPrice(0)).toBe('0');
      expect(formatPrice(100)).toBe('100');
    });

    it('should format price with EUR currency', () => {
      expect(formatPrice(1000, 'EUR')).toBe('1 000');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date);
      expect(result).toContain('2024');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format date string', () => {
      const result = formatDate('2024-01-15');
      expect(result).toContain('2024');
    });

    it('should use passed locale for month names', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date, 'ru')).toContain('2024');
      expect(formatDate(date, 'ro')).toContain('2024');
    });
  });

  describe('formatDateShort', () => {
    it('should format date in short format', () => {
      const date = new Date('2024-01-15');
      expect(formatDateShort(date)).toBe('15.01.2024');
    });

    it('should pad single digit day and month', () => {
      const date = new Date('2024-01-05');
      expect(formatDateShort(date)).toBe('05.01.2024');
    });
  });

  describe('formatAdminTableDateTime', () => {
    it('should format local date and time with dashes and 24-hour clock', () => {
      const date = new Date(2024, 0, 15, 14, 5, 9);
      expect(formatAdminTableDateTime(date)).toBe('15-01-2024 14:05:09');
    });

    it('should return em dash for null, undefined, and invalid values', () => {
      expect(formatAdminTableDateTime(null)).toBe('—');
      expect(formatAdminTableDateTime(undefined)).toBe('—');
      expect(formatAdminTableDateTime('not-a-date')).toBe('—');
    });
  });

  describe('formatDateLong', () => {
    it('should format date in long format', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatDateLong(date);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty string for invalid date', () => {
      const invalidDate = new Date('invalid');
      expect(formatDateLong(invalidDate)).toBe('');
    });
  });

  describe('formatEngineVolume', () => {
    it('should format engine volume correctly', () => {
      expect(formatEngineVolume(1.6)).toBe('1.6');
      expect(formatEngineVolume(2.0)).toBe('2');
      expect(formatEngineVolume(3.5)).toBe('3.5');
      expect(formatEngineVolume(2)).toBe('2');
      expect(formatEngineVolume(0.65)).toBe('0.65');
      expect(formatEngineVolume(0.796)).toBe('0.796');
      expect(formatEngineVolume(0.65)).toBe('0.65');
      expect(formatEngineVolume(1.5)).toBe('1.5');
      expect(formatEngineVolume(1.5)).toBe('1.5');
    });
  });

  describe('formatThousandsWithSpaces', () => {
    it('should format integer strings with spaces', () => {
      expect(formatThousandsWithSpaces('50000')).toBe('50 000');
      expect(formatThousandsWithSpaces('1234567')).toBe('1 234 567');
      expect(formatThousandsWithSpaces('100')).toBe('100');
      expect(formatThousandsWithSpaces('')).toBe('');
    });
  });

  describe('formatMileage', () => {
    it('should format mileage with spaces', () => {
      expect(formatMileage(50000)).toBe('50 000');
      expect(formatMileage(1234567)).toBe('1 234 567');
      expect(formatMileage(100)).toBe('100');
    });
  });

  describe('formatTransmission', () => {
    it('should format Manual transmission', () => {
      expect(formatTransmission('Manual', mockT)).toBe('Manual');
    });

    it('should format Automatic transmission', () => {
      expect(formatTransmission('Automatic', mockT)).toBe('Automatic');
    });

    it('should format CVT transmission', () => {
      expect(formatTransmission('CVT', mockT)).toBe('CVT');
    });

    it('should format Robot transmission', () => {
      expect(formatTransmission('Robot', mockT)).toBe('Robot');
    });

    it('should return empty string for undefined', () => {
      expect(formatTransmission(undefined, mockT)).toBe('');
    });

    it('should return original value for unknown transmission', () => {
      expect(formatTransmission('Unknown', mockT)).toBe('Unknown');
    });
  });

  describe('getListingDisplayTitle', () => {
    it('should build title from vehicle with current locale (ignore API title for display)', () => {
      const listing = {
        id: '1',
        title: 'Acura EL 2025 (Automată)',
        vehicle: {
          id: 'v1',
          brand_id: 'b1',
          model_id: 'm1',
          year: 2025,
          transmission: 'Automatic',
          drive_type: 'FWD',
          body_type: 'Sedan',
          brand: { id: 'b1', name: 'Acura' },
          model: { id: 'm1', name: 'EL', vehicle_type: 'car' },
        },
      } as Parameters<typeof getListingDisplayTitle>[0];
      expect(getListingDisplayTitle(listing, mockT)).toBe('Acura EL 2025 (Automatic)');
    });

    it('should build title from vehicle when listing.title is empty', () => {
      const listing = {
        id: '1',
        title: '',
        vehicle: {
          id: 'v1',
          brand_id: 'b1',
          model_id: 'm1',
          year: 2025,
          transmission: 'Automatic',
          drive_type: 'FWD',
          body_type: 'Sedan',
          brand: { id: 'b1', name: 'Acura' },
          model: { id: 'm1', name: 'EL', vehicle_type: 'car' },
        },
      } as Parameters<typeof getListingDisplayTitle>[0];
      expect(getListingDisplayTitle(listing, mockT)).toBe('Acura EL 2025 (Automatic)');
    });

    it('should return base title for moto without transmission when no API title', () => {
      const listing = {
        id: '1',
        title: '',
        vehicle: {
          id: 'v1',
          brand_id: 'b1',
          model_id: 'm1',
          year: 2024,
          drive_type: 'FWD',
          body_type: 'Sedan',
          brand: { id: 'b1', name: 'Honda' },
          model: { id: 'm1', name: 'CBR', vehicle_type: 'moto' },
        },
      } as Parameters<typeof getListingDisplayTitle>[0];
      expect(getListingDisplayTitle(listing, mockT)).toBe('Honda CBR 2024');
    });

    it('should fallback to listing.title when vehicle has no brand/model/year', () => {
      const listing = {
        id: '1',
        title: 'Some Title',
        vehicle: {
          id: 'v1',
          brand_id: 'b1',
          model_id: 'm1',
          drive_type: 'FWD',
          body_type: 'Sedan',
        },
      } as Parameters<typeof getListingDisplayTitle>[0];
      expect(getListingDisplayTitle(listing, mockT)).toBe('Some Title');
    });
  });

  describe('getTireModelDisplayLabel', () => {
    it('should return empty string when model is_other', () => {
      const tireOther = {
        brand_id: 'b1',
        model_id: 'm1',
        model: { id: 'm1', name: 'Other', is_other: true },
      } as Parameters<typeof getTireModelDisplayLabel>[0];
      expect(getTireModelDisplayLabel(tireOther)).toBe('');
    });

    it('should return catalog model name when not is_other', () => {
      const tire = {
        model: { id: 'm1', name: 'Alpin 6', is_other: false },
      } as Parameters<typeof getTireModelDisplayLabel>[0];
      expect(getTireModelDisplayLabel(tire)).toBe('Alpin 6');
    });
  });

  describe('formatBodyType', () => {
    it('should format Sedan', () => {
      expect(formatBodyType('Sedan', mockT)).toBe('Sedan');
    });

    it('should format Hatchback', () => {
      expect(formatBodyType('Hatchback', mockT)).toBe('Hatchback');
    });

    it('should format Wagon', () => {
      expect(formatBodyType('Wagon', mockT)).toBe('Wagon');
    });

    it('should format SUV', () => {
      expect(formatBodyType('SUV', mockT)).toBe('SUV');
    });

    it('should format Coupe', () => {
      expect(formatBodyType('Coupe', mockT)).toBe('Coupe');
    });

    it('should format Convertible', () => {
      expect(formatBodyType('Convertible', mockT)).toBe('Convertible');
    });

    it('should format Van', () => {
      expect(formatBodyType('Van', mockT)).toBe('Van');
    });

    it('should format Pickup', () => {
      expect(formatBodyType('Pickup', mockT)).toBe('Pickup');
    });

    it('should format Minivan', () => {
      expect(formatBodyType('Minivan', mockT)).toBe('Minivan');
    });

    it('should format Truck', () => {
      expect(formatBodyType('Truck', mockT)).toBe('Truck');
    });

    it('should return empty string for undefined', () => {
      expect(formatBodyType(undefined, mockT)).toBe('');
    });

    it('should return translation key for unknown body type', () => {
      expect(formatBodyType('Unknown', mockT)).toBe('vehicleOptions.bodyType.Unknown');
    });
  });

  describe('formatFuel', () => {
    it('should format Petrol', () => {
      expect(formatFuel('Petrol', mockT)).toBe('Petrol');
    });

    it('should format Diesel', () => {
      expect(formatFuel('Diesel', mockT)).toBe('Diesel');
    });

    it('should format Electric', () => {
      expect(formatFuel('Electric', mockT)).toBe('Electric');
    });

    it('should format Hybrid', () => {
      expect(formatFuel('Hybrid', mockT)).toBe('Hybrid');
    });

    it('should format MHEV', () => {
      expect(formatFuel('MHEV', mockT)).toBe('Hybrid (MHEV)');
    });

    it('should format PHEV', () => {
      expect(formatFuel('PHEV', mockT)).toBe('Hybrid (PHEV)');
    });

    it('should format LPG', () => {
      expect(formatFuel('LPG', mockT)).toBe('LPG');
    });

    it('should return empty string for undefined', () => {
      expect(formatFuel(undefined, mockT)).toBe('');
    });

    it('should return original value for unknown fuel type', () => {
      expect(formatFuel('Unknown', mockT)).toBe('Unknown');
    });
  });

  describe('horsepowerToKw', () => {
    it('should convert horsepower to kilowatts correctly', () => {
      expect(horsepowerToKw(100)).toBe(74);
      expect(horsepowerToKw(150)).toBe(110);
      expect(horsepowerToKw(200)).toBe(147);
      expect(horsepowerToKw(300)).toBe(221);
    });

    it('should round the result', () => {
      expect(horsepowerToKw(1)).toBe(1);
      expect(horsepowerToKw(10)).toBe(7);
    });
  });

  describe('kwToHorsepower', () => {
    it('should convert kilowatts to horsepower correctly', () => {
      expect(kwToHorsepower(74)).toBe(101);
      expect(kwToHorsepower(110)).toBe(150);
      expect(kwToHorsepower(147)).toBe(200);
      expect(kwToHorsepower(221)).toBe(300);
    });

    it('should round the result', () => {
      expect(kwToHorsepower(1)).toBe(1);
      expect(kwToHorsepower(7)).toBe(10);
    });
  });

  describe('getCityNamePlain', () => {
    const cities = [{ name: 'Chișinău', nameEn: 'Chisinau', nameRu: 'Кишинёв' }];

    it('should return Russian name without parentheses for ru locale', () => {
      expect(getCityNamePlain('Chisinau', 'ru', cities)).toBe('Кишинёв');
    });

    it('should return Romanian name for ro locale', () => {
      expect(getCityNamePlain('Chisinau', 'ro', cities)).toBe('Chișinău');
    });

    it('should return English name for en locale', () => {
      expect(getCityNamePlain('Chisinau', 'en', cities)).toBe('Chisinau');
    });

    it('should resolve a stored official name to English and Russian labels', () => {
      expect(getCityNamePlain('Chișinău', 'en', cities)).toBe('Chisinau');
      expect(getCityNamePlain('Chișinău', 'ru', cities)).toBe('Кишинёв');
    });
  });

  describe('Albania city names', () => {
    const cities = [
      { name: 'Tiranë', nameEn: 'Tirana' },
      { name: 'Durrës', nameEn: 'Durres' },
    ];

    beforeEach(() => {
      process.env.COUNTRY = 'al';
      process.env.NEXT_PUBLIC_COUNTRY = 'al';
    });

    afterEach(() => {
      process.env.COUNTRY = 'md';
      process.env.NEXT_PUBLIC_COUNTRY = 'md';
    });

    it('should show English names without diacritics for sq and en', () => {
      expect(getCityName('Tiranë', 'sq', cities)).toBe('Tirana');
      expect(getCityName('Durrës', 'en', cities)).toBe('Durres');
      expect(getCityNamePlain('Tiranë', 'sq', cities)).toBe('Tirana');
      expect(getCityNamePlain('Tirana', 'sq', cities)).toBe('Tirana');
    });
  });

  describe('buildHomeCategoryTitle', () => {
    it('should build category title from template', () => {
      expect(buildHomeCategoryTitle(seoMockT, 'car')).toBe(
        'Kupito.club: buy and sell cars in Moldova',
      );
    });
  });

  describe('buildHomeBrandTitle', () => {
    it('should build brand title from template', () => {
      expect(buildHomeBrandTitle(seoMockT, 'BMW')).toBe(
        'Buy or sell BMW in Moldova on Kupito.club',
      );
    });
  });

  describe('createSlug', () => {
    it('keeps latin brand names unchanged', () => {
      expect(createSlug('BMW')).toBe('bmw');
      expect(createSlug('Mercedes-Benz')).toBe('mercedes-benz');
      expect(createSlug('Alfa Romeo')).toBe('alfa-romeo');
    });

    it('transliterates cyrillic brand names', () => {
      expect(createSlug('ВАЗ')).toBe('vaz');
      expect(createSlug('ИЖ')).toBe('izh');
      expect(createSlug('Москвич')).toBe('moskvich');
      expect(createSlug('УАЗ')).toBe('uaz');
      expect(createSlug('ЛуАЗ')).toBe('luaz');
      expect(createSlug('Минск')).toBe('minsk');
    });

    it('handles mixed cyrillic and latin characters', () => {
      expect(createSlug('МT')).toBe('mt');
    });

    it('matches transliterated cyrillic names via slugMatches', () => {
      expect(slugMatches('vaz', 'ВАЗ')).toBe(true);
      expect(slugMatches('mt', 'МT')).toBe(true);
      expect(slugMatches('bmw', 'BMW')).toBe(true);
    });
  });

  describe('buildListingSeoTitle', () => {
    it('should build full vehicle SEO title with all fields', () => {
      const listing = {
        id: '1',
        title: 'Hyundai Grand Starex',
        city: 'Chisinau',
        price: 2000,
        currency: 'EUR',
        horsepower: 145,
        vehicle: {
          id: 'v1',
          brand_id: 'b1',
          model_id: 'm1',
          year: 2011,
          engine_displ_l: 2.5,
          fuel: 'Diesel',
          transmission: 'Automatic',
          drive_type: 'FWD',
          body_type: 'Minivan',
          brand: { id: 'b1', name: 'Hyundai' },
          model: { id: 'm1', name: 'Grand Starex I', vehicle_type: 'car' },
        },
      } as Parameters<typeof buildListingSeoTitle>[0];
      const cities = [{ name: 'Chișinău', nameEn: 'Chisinau', nameRu: 'Кишинёв' }];
      const title = buildListingSeoTitle(listing, seoMockT, 'en', cities);
      expect(title).toContain('Buy Hyundai Grand Starex I 2.5 (145 hp) diesel automatic');
      expect(title).toContain('in Chisinau');
      expect(title).toContain('minivan 2011 priced at 2 000 EUR');
      expect(title).toContain('on Kupito.club');
    });

    it('should normalize engine volume from padded decimal string', () => {
      const listing = {
        id: '1',
        title: 'Toyota RAV4',
        city: 'Chisinau',
        price: 27290,
        currency: 'EUR',
        horsepower: 218,
        vehicle: {
          id: 'v1',
          brand_id: 'b1',
          model_id: 'm1',
          year: 2021,
          engine_displ_l: '2.500' as unknown as number,
          fuel: 'Hybrid',
          transmission: 'Automatic',
          drive_type: 'AWD',
          body_type: 'SUV',
          brand: { id: 'b1', name: 'Toyota' },
          model: { id: 'm1', name: 'RAV4', vehicle_type: 'car' },
        },
      } as Parameters<typeof buildListingSeoTitle>[0];
      const title = buildListingSeoTitle(listing, seoMockT, 'en');
      expect(title).toContain('Toyota RAV4 2.5 (218 hp)');
      expect(title).not.toContain('2.500');
    });

    it('should keep significant decimals for moto engine volume', () => {
      const listing = {
        id: '1',
        title: 'Honda CBR',
        city: 'Chisinau',
        price: 5000,
        currency: 'EUR',
        horsepower: 90,
        vehicle: {
          id: 'v1',
          brand_id: 'b1',
          model_id: 'm1',
          year: 2019,
          engine_displ_l: '0.876' as unknown as number,
          fuel: 'Petrol',
          transmission: 'Manual',
          brand: { id: 'b1', name: 'Honda' },
          model: { id: 'm1', name: 'CBR', vehicle_type: 'moto' },
        },
      } as Parameters<typeof buildListingSeoTitle>[0];
      const title = buildListingSeoTitle(listing, seoMockT, 'en');
      expect(title).toContain('Honda CBR 0.876 (90 hp)');
    });

    it('should drop trailing zeros for whole engine volume', () => {
      const listing = {
        id: '1',
        title: 'BMW 320',
        city: 'Chisinau',
        vehicle: {
          id: 'v1',
          brand_id: 'b1',
          model_id: 'm1',
          year: 2020,
          engine_displ_l: '2.000' as unknown as number,
          brand: { id: 'b1', name: 'BMW' },
          model: { id: 'm1', name: '320', vehicle_type: 'car' },
        },
      } as Parameters<typeof buildListingSeoTitle>[0];
      const title = buildListingSeoTitle(listing, seoMockT, 'en');
      expect(title).toContain('BMW 320 2 ');
      expect(title).not.toContain('2.000');
      expect(title).not.toContain('2.0 ');
    });

    it('should omit missing optional segments', () => {
      const listing = {
        id: '1',
        title: 'BMW 320',
        city: 'Chisinau',
        vehicle: {
          id: 'v1',
          brand_id: 'b1',
          model_id: 'm1',
          year: 2020,
          drive_type: 'FWD',
          body_type: 'Sedan',
          brand: { id: 'b1', name: 'BMW' },
          model: { id: 'm1', name: '320', vehicle_type: 'car' },
        },
      } as Parameters<typeof buildListingSeoTitle>[0];
      const title = buildListingSeoTitle(listing, seoMockT, 'en');
      expect(title).not.toContain('hp');
      expect(title).not.toContain('priced at');
      expect(title).toContain('Buy BMW 320');
      expect(title).toContain('on Kupito.club');
    });
  });
});
