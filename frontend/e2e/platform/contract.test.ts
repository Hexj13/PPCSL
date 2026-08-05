import type { SiteConfig } from '@/lib/site-config';

import {
  buildE2ePlatformFromSite,
  buildUniquePlatformPhone,
  E2E_PHONE_REGIONS,
  resetE2ePlatformCache,
  resolveE2eCountryCode,
} from './contract';

const mdSite: SiteConfig = {
  country: 'md',
  name: 'Kupito',
  domain: 'kupito.club',
  locale: 'ro-MD',
  currency: 'EUR',
  currencies: ['EUR', 'MDL'],
  countryCode: 'MD',
  supportEmail: 'support@kupito.club',
  siteUrl: 'https://kupito.club',
  localeRouting: {
    defaultLocale: 'ro',
    supportedLocales: ['ro', 'ru', 'en'],
    prefixedLocales: ['ru', 'en'],
    languageSwitcherTranslationKeys: {
      ro: 'common.languageRo',
      ru: 'common.languageRu',
      en: 'common.languageEn',
    },
  },
};

const alSite: SiteConfig = {
  country: 'al',
  name: 'MakinaGuru',
  domain: 'makinaguru.com',
  locale: 'sq-AL',
  currency: 'EUR',
  currencies: ['EUR', 'ALL'],
  countryCode: 'AL',
  supportEmail: 'support@makinaguru.com',
  siteUrl: 'https://makinaguru.com',
  localeRouting: {
    defaultLocale: 'sq',
    supportedLocales: ['sq', 'en'],
    prefixedLocales: ['en'],
    languageSwitcherTranslationKeys: {
      sq: 'common.languageSq',
      en: 'common.languageEn',
    },
  },
};

describe('e2e platform contract', () => {
  const prevCountry = process.env.COUNTRY;
  const prevPublicCountry = process.env.NEXT_PUBLIC_COUNTRY;

  afterEach(() => {
    if (prevCountry === undefined) {
      delete process.env.COUNTRY;
    } else {
      process.env.COUNTRY = prevCountry;
    }
    if (prevPublicCountry === undefined) {
      delete process.env.NEXT_PUBLIC_COUNTRY;
    } else {
      process.env.NEXT_PUBLIC_COUNTRY = prevPublicCountry;
    }
    resetE2ePlatformCache();
  });

  it('resolves COUNTRY from env with md fallback', () => {
    delete process.env.COUNTRY;
    delete process.env.NEXT_PUBLIC_COUNTRY;
    expect(resolveE2eCountryCode()).toBe('md');

    process.env.NEXT_PUBLIC_COUNTRY = 'al';
    expect(resolveE2eCountryCode()).toBe('al');

    process.env.COUNTRY = 'MD';
    expect(resolveE2eCountryCode()).toBe('md');
  });

  it('builds Moldova platform defaults from site config', () => {
    const platform = buildE2ePlatformFromSite(mdSite, 'md');
    expect(platform.defaultLocale).toBe('ro');
    expect(platform.prefixedLocales).toEqual(['ru', 'en']);
    expect(platform.browserLocale).toBe('ro-MD');
    expect(platform.phone).toEqual({
      callingCode: '373',
      e164Prefix: '+373',
      nationalDigits: 8,
      mobileNationalPrefix: '79',
    });
    expect(platform.localeCookieName).toBe('kupito-locale');
  });

  it('builds Albania platform defaults from site config', () => {
    const platform = buildE2ePlatformFromSite(alSite, 'al');
    expect(platform.defaultLocale).toBe('sq');
    expect(platform.supportedLocales).toEqual(['sq', 'en']);
    expect(platform.prefixedLocales).toEqual(['en']);
    expect(platform.browserLocale).toBe('sq-AL');
    expect(platform.phone).toEqual({
      callingCode: '355',
      e164Prefix: '+355',
      nationalDigits: 9,
      mobileNationalPrefix: '69',
    });
  });

  it('generates unique phones matching national digit length for md and al', () => {
    const mdPhone = buildUniquePlatformPhone(buildE2ePlatformFromSite(mdSite, 'md'));
    const alPhone = buildUniquePlatformPhone(buildE2ePlatformFromSite(alSite, 'al'));

    expect(mdPhone).toMatch(/^\+37379\d{6}$/);
    expect(alPhone).toMatch(/^\+35569\d{7}$/);

    expect(E2E_PHONE_REGIONS.md?.callingCode).toBe('373');
    expect(E2E_PHONE_REGIONS.al?.callingCode).toBe('355');
  });
});
