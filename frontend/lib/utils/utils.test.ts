import {
  formatAdminTableDateTime,
  formatBodyType,
  formatDate,
  formatDateLong,
  formatDateShort,
  formatEngineVolume,
  formatFuel,
  formatMileage,
  formatPrice,
  formatTransmission,
  getListingDisplayTitle,
  getTireModelDisplayLabel,
  horsepowerToKw,
  kwToHorsepower,
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
});
