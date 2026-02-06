import { Price } from './price.vo';

describe('Price', () => {
  describe('constructor', () => {
    it('creates valid price with EUR', () => {
      const price = new Price(10000, 'EUR');
      expect(price.amount).toBe(10000);
      expect(price.currency).toBe('EUR');
    });

    it('creates valid price with MDL', () => {
      const price = new Price(0, 'MDL');
      expect(price.amount).toBe(0);
      expect(price.currency).toBe('MDL');
    });

    it('throws when amount is negative', () => {
      expect(() => new Price(-1, 'EUR')).toThrow('Invalid price');
    });

    it('throws when amount exceeds max', () => {
      expect(() => new Price(1_000_000_000, 'EUR')).toThrow('Invalid price');
    });

    it('throws when currency is invalid', () => {
      expect(() => new Price(100, 'USD' as 'EUR')).toThrow('Invalid currency');
    });
  });

  describe('equals', () => {
    it('returns true for same amount and currency', () => {
      const a = new Price(100, 'EUR');
      const b = new Price(100, 'EUR');
      expect(a.equals(b)).toBe(true);
    });

    it('returns false when amount differs', () => {
      const a = new Price(100, 'EUR');
      const b = new Price(101, 'EUR');
      expect(a.equals(b)).toBe(false);
    });

    it('returns false when currency differs', () => {
      const a = new Price(100, 'EUR');
      const b = new Price(100, 'MDL');
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toString', () => {
    it('returns amount and currency', () => {
      expect(new Price(25000, 'EUR').toString()).toBe('25000 EUR');
      expect(new Price(500000, 'MDL').toString()).toBe('500000 MDL');
    });
  });
});
