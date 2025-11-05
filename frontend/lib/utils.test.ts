import {
  formatBodyType,
  formatDate,
  formatDateShort,
  formatEngineVolume,
  formatMileage,
  formatPrice,
  formatTransmission,
} from './utils';

describe('utils', () => {
  describe('formatPrice', () => {
    it('should format price correctly', () => {
      expect(formatPrice(10000)).toBe('10\xa0000');
      expect(formatPrice(1234567)).toBe('1\xa0234\xa0567');
      expect(formatPrice(0)).toBe('0');
    });

    it('should format price with EUR currency', () => {
      expect(formatPrice(1000, 'EUR')).toBe('1\xa0000');
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
      expect(formatTransmission('Manual')).toBe('Мануелна');
    });

    it('should format Automatic transmission', () => {
      expect(formatTransmission('Automatic')).toBe('Автоматска');
    });

    it('should format CVT transmission', () => {
      expect(formatTransmission('CVT')).toBe('Варијатор');
    });

    it('should return empty string for undefined', () => {
      expect(formatTransmission(undefined)).toBe('');
    });

    it('should return original value for unknown transmission', () => {
      expect(formatTransmission('Unknown')).toBe('Unknown');
    });
  });

  describe('formatBodyType', () => {
    it('should format Sedan', () => {
      expect(formatBodyType('Sedan')).toBe('Седан');
    });

    it('should format Hatchback', () => {
      expect(formatBodyType('Hatchback')).toBe('Хечбек');
    });

    it('should format Wagon', () => {
      expect(formatBodyType('Wagon')).toBe('Караван');
    });

    it('should format SUV', () => {
      expect(formatBodyType('SUV')).toBe('SUV');
    });

    it('should format Coupe', () => {
      expect(formatBodyType('Coupe')).toBe('Купе');
    });

    it('should format Convertible', () => {
      expect(formatBodyType('Convertible')).toBe('Кабриолет');
    });

    it('should format Van', () => {
      expect(formatBodyType('Van')).toBe('Фургон');
    });

    it('should format Pickup', () => {
      expect(formatBodyType('Pickup')).toBe('Пикап');
    });

    it('should format Minivan', () => {
      expect(formatBodyType('Minivan')).toBe('Миниван');
    });

    it('should return empty string for undefined', () => {
      expect(formatBodyType(undefined)).toBe('');
    });

    it('should return original value for unknown body type', () => {
      expect(formatBodyType('Unknown')).toBe('Unknown');
    });
  });
});
