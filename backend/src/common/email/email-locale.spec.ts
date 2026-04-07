import { interpolateEmailTemplate, resolveEmailLocale } from './email-locale';

describe('email-locale', () => {
  describe('resolveEmailLocale', () => {
    it('returns en when preferred locale is missing or unknown', () => {
      expect(resolveEmailLocale(null)).toBe('en');
      expect(resolveEmailLocale(undefined)).toBe('en');
      expect(resolveEmailLocale('')).toBe('en');
      expect(resolveEmailLocale('de')).toBe('en');
    });

    it('normalizes supported locales', () => {
      expect(resolveEmailLocale('RO')).toBe('ro');
      expect(resolveEmailLocale(' ru ')).toBe('ru');
      expect(resolveEmailLocale('en')).toBe('en');
    });
  });

  describe('interpolateEmailTemplate', () => {
    it('replaces placeholders', () => {
      expect(interpolateEmailTemplate('Hello {name}, count {n}', { name: 'A', n: 2 })).toBe(
        'Hello A, count 2',
      );
    });
  });
});
