import { interpolateEmailTemplate, localizedEmailPath, resolveEmailLocale } from './email-locale';

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
      expect(resolveEmailLocale('SQ')).toBe('sq');
    });

    it('maps unsupported locales to DEFAULT_LOCALE when SUPPORTED_LOCALES is set', () => {
      const options = { supportedLocales: 'sq,en', defaultLocale: 'sq' };
      expect(resolveEmailLocale('ro', options)).toBe('sq');
      expect(resolveEmailLocale('ru', options)).toBe('sq');
      expect(resolveEmailLocale('de', options)).toBe('sq');
      expect(resolveEmailLocale(null, options)).toBe('sq');
      expect(resolveEmailLocale('en', options)).toBe('en');
      expect(resolveEmailLocale('SQ', options)).toBe('sq');
    });
  });

  describe('localizedEmailPath', () => {
    it('omits the prefix for the default locale', () => {
      expect(localizedEmailPath('/verify-email?token=abc', 'sq', 'sq')).toBe(
        '/verify-email?token=abc',
      );
    });

    it('prefixes non-default locales', () => {
      expect(localizedEmailPath('/verify-email?token=abc', 'en', 'sq')).toBe(
        '/en/verify-email?token=abc',
      );
      expect(localizedEmailPath('/my-listings', 'en', 'sq')).toBe('/en/my-listings');
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
