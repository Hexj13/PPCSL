import {
  formatBodyType,
  formatDate,
  formatDateLong,
  formatDateShort,
  formatEngineVolume,
  formatFuel,
  formatMileage,
  formatPrice,
  formatTransmission,
  horsepowerToKw,
  kwToHorsepower,
} from './utils';

jest.mock('./site-config', () => ({
  loadSiteConfigSync: jest.fn(() => ({
    locale: 'en-US',
    currency: 'EUR',
  })),
}));

const mockT = (key: string): string => {
  const translations: Record<string, string> = {
    'vehicleOptions.transmission.Manual': 'Мануелна',
    'vehicleOptions.transmission.Automatic': 'Автоматска',
    'vehicleOptions.transmission.CVT': 'Варијатор',
    'vehicleOptions.transmission.Robot': 'Робот',
    'vehicleOptions.driveType.FWD': 'Преден',
    'vehicleOptions.driveType.RWD': 'Заден',
    'vehicleOptions.driveType.AWD': 'Полн',
    'vehicleOptions.bodyType.Sedan': 'Седан',
    'vehicleOptions.bodyType.Hatchback': 'Хечбек',
    'vehicleOptions.bodyType.Wagon': 'Караван',
    'vehicleOptions.bodyType.SUV': 'SUV',
    'vehicleOptions.bodyType.Coupe': 'Купе',
    'vehicleOptions.bodyType.Convertible': 'Кабриолет',
    'vehicleOptions.bodyType.Van': 'Фургон',
    'vehicleOptions.bodyType.Pickup': 'Пикап',
    'vehicleOptions.bodyType.Minivan': 'Миниван',
    'vehicleOptions.bodyType.Truck': 'Камион',
    'vehicleOptions.fuel.Petrol': 'Бензин',
    'vehicleOptions.fuel.Diesel': 'Дизел',
    'vehicleOptions.fuel.Electric': 'Електричен',
    'vehicleOptions.fuel.Hybrid': 'Хибриден',
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
      expect(result).toContain('јануари');
    });

    it('should format date string', () => {
      const result = formatDate('2024-01-15');
      expect(result).toContain('2024');
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
      expect(formatEngineVolume(2.0)).toBe('2.0');
      expect(formatEngineVolume(3.5)).toBe('3.5');
      expect(formatEngineVolume(2)).toBe('2.0');
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
      expect(formatTransmission('Manual', mockT)).toBe('Мануелна');
    });

    it('should format Automatic transmission', () => {
      expect(formatTransmission('Automatic', mockT)).toBe('Автоматска');
    });

    it('should format CVT transmission', () => {
      expect(formatTransmission('CVT', mockT)).toBe('Варијатор');
    });

    it('should format Robot transmission', () => {
      expect(formatTransmission('Robot', mockT)).toBe('Робот');
    });

    it('should return empty string for undefined', () => {
      expect(formatTransmission(undefined, mockT)).toBe('');
    });

    it('should return original value for unknown transmission', () => {
      expect(formatTransmission('Unknown', mockT)).toBe('Unknown');
    });
  });

  describe('formatBodyType', () => {
    it('should format Sedan', () => {
      expect(formatBodyType('Sedan', mockT)).toBe('Седан');
    });

    it('should format Hatchback', () => {
      expect(formatBodyType('Hatchback', mockT)).toBe('Хечбек');
    });

    it('should format Wagon', () => {
      expect(formatBodyType('Wagon', mockT)).toBe('Караван');
    });

    it('should format SUV', () => {
      expect(formatBodyType('SUV', mockT)).toBe('SUV');
    });

    it('should format Coupe', () => {
      expect(formatBodyType('Coupe', mockT)).toBe('Купе');
    });

    it('should format Convertible', () => {
      expect(formatBodyType('Convertible', mockT)).toBe('Кабриолет');
    });

    it('should format Van', () => {
      expect(formatBodyType('Van', mockT)).toBe('Фургон');
    });

    it('should format Pickup', () => {
      expect(formatBodyType('Pickup', mockT)).toBe('Пикап');
    });

    it('should format Minivan', () => {
      expect(formatBodyType('Minivan', mockT)).toBe('Миниван');
    });

    it('should format Truck', () => {
      expect(formatBodyType('Truck', mockT)).toBe('Камион');
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
      expect(formatFuel('Petrol', mockT)).toBe('Бензин');
    });

    it('should format Diesel', () => {
      expect(formatFuel('Diesel', mockT)).toBe('Дизел');
    });

    it('should format Electric', () => {
      expect(formatFuel('Electric', mockT)).toBe('Електричен');
    });

    it('should format Hybrid', () => {
      expect(formatFuel('Hybrid', mockT)).toBe('Хибриден');
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
