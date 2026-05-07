import { resolveLocaleRouting } from './locale-routing';
import type { SiteConfig } from './site-config';

describe('resolveLocaleRouting', () => {
  it('preserves supportedLocales order from config', () => {
    const site = {
      country: 'x',
      name: 't',
      domain: 't',
      locale: 'en-US',
      currency: 'EUR',
      currencies: ['EUR'] as const,
      countryCode: 'US',
      supportEmail: 'a@b.c',
      siteUrl: 'https://t',
      localeRouting: {
        defaultLocale: 'bg',
        supportedLocales: ['bg', 'en', 'de'],
        prefixedLocales: ['en', 'de'],
        enableLegacyDefaultLocaleRedirect: false,
      },
    } as SiteConfig;
    const r = resolveLocaleRouting(site);
    expect([...r.supportedLocales]).toEqual(['bg', 'en', 'de']);
    expect(new Set(r.prefixedLocales)).toEqual(new Set(['en', 'de']));
  });

  it('falls back to Moldova defaults when defaultLocale is not in supportedLocales', () => {
    const site = {
      country: 'x',
      name: 't',
      domain: 't',
      locale: 'en-US',
      currency: 'EUR',
      currencies: ['EUR'] as const,
      countryCode: 'US',
      supportEmail: 'a@b.c',
      siteUrl: 'https://t',
      localeRouting: {
        defaultLocale: 'xx',
        supportedLocales: ['en'],
        prefixedLocales: [],
      },
    } as SiteConfig;
    const r = resolveLocaleRouting(site);
    expect(r.defaultLocale).toBe('ro');
    expect(r.supportedLocales).toEqual(['ro', 'ru']);
  });

  it('maps enableLegacyRoPathRedirect to enableLegacyDefaultLocaleRedirect when new field is omitted', () => {
    const site = {
      country: 'x',
      name: 't',
      domain: 't',
      locale: 'bg-BG',
      currency: 'EUR',
      currencies: ['EUR'] as const,
      countryCode: 'BG',
      supportEmail: 'a@b.c',
      siteUrl: 'https://t',
      localeRouting: {
        defaultLocale: 'bg',
        supportedLocales: ['bg', 'en'],
        prefixedLocales: ['en'],
        enableLegacyRoPathRedirect: true,
      },
    } as SiteConfig;
    const r = resolveLocaleRouting(site);
    expect(r.enableLegacyDefaultLocaleRedirect).toBe(true);
  });

  it('honors explicit enableLegacyDefaultLocaleRedirect false over legacy flag', () => {
    const site = {
      country: 'x',
      name: 't',
      domain: 't',
      locale: 'bg-BG',
      currency: 'EUR',
      currencies: ['EUR'] as const,
      countryCode: 'BG',
      supportEmail: 'a@b.c',
      siteUrl: 'https://t',
      localeRouting: {
        defaultLocale: 'bg',
        supportedLocales: ['bg', 'en'],
        prefixedLocales: ['en'],
        enableLegacyDefaultLocaleRedirect: false,
        enableLegacyRoPathRedirect: true,
      },
    } as SiteConfig;
    const r = resolveLocaleRouting(site);
    expect(r.enableLegacyDefaultLocaleRedirect).toBe(false);
  });
});
