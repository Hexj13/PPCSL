import type { ResolvedLocaleRouting } from './locale-routing';
import {
  absoluteUrlWithLocalePrefix,
  canonicalLowercaseRuPathname,
  canonicalForLocaleFromRo,
  hreflangLanguagesFromRoCanonical,
  localePrefixPath,
  roCanonicalToAbsoluteRu,
  stripLocalePrefixFromPathname,
} from './url-locale';

const BG_EN_ROUTING: ResolvedLocaleRouting = {
  defaultLocale: 'bg',
  supportedLocales: ['bg', 'en'],
  prefixedLocales: ['en'],
  enableLegacyDefaultLocaleRedirect: false,
  languageSwitcherTranslationKeys: {
    bg: 'common.languageLocaleCode',
    en: 'common.languageLocaleCode',
  },
};

const ONE_LOCALE_ROUTING: ResolvedLocaleRouting = {
  defaultLocale: 'en',
  supportedLocales: ['en'],
  prefixedLocales: [],
  enableLegacyDefaultLocaleRedirect: false,
  languageSwitcherTranslationKeys: { en: 'common.languageLocaleCode' },
};

describe('url-locale', () => {
  const site = 'https://example.com';

  describe('localePrefixPath', () => {
    it('prefixes ru paths', () => {
      expect(localePrefixPath('/', 'ru')).toBe('/ru');
      expect(localePrefixPath('/dacia', 'ru')).toBe('/ru/dacia');
      expect(localePrefixPath('/listings/x', 'ru')).toBe('/ru/listings/x');
    });

    it('does not double-prefix when path already has /ru', () => {
      expect(localePrefixPath('/ru/dacia', 'ru')).toBe('/ru/dacia');
      expect(localePrefixPath('/RU/dacia', 'ru')).toBe('/ru/dacia');
    });

    it('prefixes home with query for ru', () => {
      expect(localePrefixPath('/?category=tire', 'ru')).toBe('/ru/?category=tire');
    });

    it('strips /ru for ro locale', () => {
      expect(localePrefixPath('/ru/dacia', 'ro')).toBe('/dacia');
    });

    it('leaves ro paths unchanged', () => {
      expect(localePrefixPath('/dacia', 'ro')).toBe('/dacia');
    });
  });

  describe('stripLocalePrefixFromPathname', () => {
    it('strips /ru prefix', () => {
      expect(stripLocalePrefixFromPathname('/ru')).toEqual({ locale: 'ru', restPath: '/' });
      expect(stripLocalePrefixFromPathname('/ru/dacia')).toEqual({
        locale: 'ru',
        restPath: '/dacia',
      });
    });

    it('returns ro for paths without ru prefix', () => {
      expect(stripLocalePrefixFromPathname('/dacia')).toEqual({ locale: 'ro', restPath: '/dacia' });
    });

    it('strips case-insensitive /ru prefix', () => {
      expect(stripLocalePrefixFromPathname('/RU/dacia')).toEqual({
        locale: 'ru',
        restPath: '/dacia',
      });
      expect(stripLocalePrefixFromPathname('/Ru')).toEqual({ locale: 'ru', restPath: '/' });
    });
  });

  describe('canonicalLowercaseRuPathname', () => {
    it('returns null when already lowercase /ru', () => {
      expect(canonicalLowercaseRuPathname('/ru/dacia')).toBeNull();
      expect(canonicalLowercaseRuPathname('/ru')).toBeNull();
    });

    it('returns canonical path for uppercase prefix', () => {
      expect(canonicalLowercaseRuPathname('/RU/dacia')).toBe('/ru/dacia');
      expect(canonicalLowercaseRuPathname('/RU')).toBe('/ru');
    });
  });

  describe('absoluteUrlWithLocalePrefix', () => {
    it('builds ru absolute URLs', () => {
      expect(absoluteUrlWithLocalePrefix(site, '/dacia', 'ru')).toBe(
        'https://example.com/ru/dacia',
      );
    });
  });

  describe('canonicalForLocaleFromRo', () => {
    it('maps ro canonical to ru absolute', () => {
      const ro = `${site}/dacia/duster`;
      expect(canonicalForLocaleFromRo(ro, 'ro')).toBe(ro);
      expect(canonicalForLocaleFromRo(ro, 'ru')).toBe(`${site}/ru/dacia/duster`);
    });
  });

  describe('roCanonicalToAbsoluteRu', () => {
    it('handles home with query', () => {
      const ro = `${site}/?category=tire`;
      expect(roCanonicalToAbsoluteRu(ro)).toBe(`${site}/ru/?category=tire`);
    });

    it('does not duplicate /ru when url already has ru prefix', () => {
      const ru = `${site}/ru/dacia`;
      expect(roCanonicalToAbsoluteRu(ru)).toBe(`${site}/ru/dacia`);
    });
  });

  describe('localePrefixPath with explicit routing', () => {
    it('prefixes configured non-default locale', () => {
      expect(localePrefixPath('/listings/x', 'en', BG_EN_ROUTING)).toBe('/en/listings/x');
      expect(localePrefixPath('/en/listings/x', 'bg', BG_EN_ROUTING)).toBe('/listings/x');
    });

    it('does not add prefix for one-locale routing', () => {
      expect(localePrefixPath('/foo', 'en', ONE_LOCALE_ROUTING)).toBe('/foo');
    });
  });

  describe('stripLocalePrefixFromPathname with explicit routing', () => {
    it('detects configured prefix locale', () => {
      expect(stripLocalePrefixFromPathname('/en/items', BG_EN_ROUTING)).toEqual({
        locale: 'en',
        restPath: '/items',
      });
    });
  });

  describe('hreflangLanguagesFromRoCanonical with explicit routing', () => {
    it('includes every supported locale and x-default', () => {
      const origin = 'https://example.com';
      const ro = `${origin}/x`;
      const langs = hreflangLanguagesFromRoCanonical(ro, BG_EN_ROUTING);
      expect(langs.bg).toBe(ro);
      expect(langs.en).toBe(`${origin}/en/x`);
      expect(langs['x-default']).toBe(ro);
    });
  });

  describe('hreflangLanguagesFromRoCanonical', () => {
    it('returns ro, ru, and x-default', () => {
      const ro = `${site}/dacia`;
      const langs = hreflangLanguagesFromRoCanonical(ro);
      expect(langs.ro).toBe(ro);
      expect(langs.ru).toBe(`${site}/ru/dacia`);
      expect(langs['x-default']).toBe(ro);
    });
  });
});
