import {
  interpolateI18nTemplate,
  resolveI18nBundleLocales,
  resolveI18nLocalesToLoad,
} from './i18n.service';

describe('interpolateI18nTemplate', () => {
  it('replaces {siteName} placeholders', () => {
    expect(interpolateI18nTemplate('Hello {siteName}', { siteName: 'Example Market' })).toBe(
      'Hello Example Market',
    );
  });
});

describe('resolveI18nBundleLocales', () => {
  it('does not force Romanian when the platform default is another locale', () => {
    expect(resolveI18nBundleLocales('sq', 'sq')).toEqual(['sq', 'en']);
  });

  it('keeps the platform default before English', () => {
    expect(resolveI18nBundleLocales('ru', 'ro')).toEqual(['ru', 'ro', 'en']);
  });

  it('deduplicates requested and default locales', () => {
    expect(resolveI18nBundleLocales('en', 'en')).toEqual(['en']);
  });
});

describe('resolveI18nLocalesToLoad', () => {
  it('loads every bundled locale when no platform list is configured', () => {
    expect(resolveI18nLocalesToLoad({ defaultLocale: 'ro' })).toEqual(['ro', 'ru', 'en', 'sq']);
  });

  it('loads only overlay locales so unused brand copies stay off disk', () => {
    expect(
      resolveI18nLocalesToLoad({
        defaultLocale: 'sq',
        overlaySupportedLocales: ['sq', 'en'],
      }),
    ).toEqual(['en', 'sq']);
  });

  it('prefers SUPPORTED_LOCALES env over overlay', () => {
    expect(
      resolveI18nLocalesToLoad({
        defaultLocale: 'en',
        supportedLocalesEnv: 'en,sq',
        overlaySupportedLocales: ['ro', 'ru', 'en'],
      }),
    ).toEqual(['en', 'sq']);
  });
});
