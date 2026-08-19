import type { SiteConfig } from '@/lib/site-config';
import { loadSiteConfigSync } from '@/lib/site-config';

/** Matches `COOKIE_KEY` / `STORAGE_KEY` in `lib/i18n.ts`. */
export const E2E_LOCALE_COOKIE_NAME = 'ppcsl-locale';

/** Matches `PREFERRED_LOCALE_COOKIE_KEY` in `lib/i18n.ts`. */
export const E2E_PREFERRED_LOCALE_COOKIE_NAME = 'ppcsl-preferred-locale';

/**
 * Listing form description tabs keep legacy test ids (`-ro` / `-ru`) in the UI
 * even when platform description locales are sq/en. Slot0 = first description locale.
 */
export const E2E_DESCRIPTION_TAB_SLOT0_TEST_ID = 'listing-form-description-tab-ro';

type E2ePhoneRegion = {
  callingCode: string;
  nationalDigits: number;
  /** Leading national digits that look like a mobile line for SMS validation. */
  mobileNationalPrefix: string;
};

/**
 * Phone regions for e2e generation. Keep in sync with `lib/phone/phone.ts` PHONE_REGIONS
 * (callingCode + nationalDigits). Mobile prefixes are e2e-only for valid SMS numbers.
 */
export const E2E_PHONE_REGIONS: Record<string, E2ePhoneRegion> = {
  md: { callingCode: '373', nationalDigits: 8, mobileNationalPrefix: '79' },
  al: { callingCode: '355', nationalDigits: 9, mobileNationalPrefix: '69' },
};

export type E2ePlatform = {
  country: string;
  countryCode: string;
  domain: string;
  /** BCP-47-ish browser locale from site config, e.g. `ro-MD` / `sq-AL`. */
  browserLocale: string;
  defaultLocale: string;
  supportedLocales: readonly string[];
  prefixedLocales: readonly string[];
  languageSwitcherTranslationKeys: Readonly<Record<string, string>>;
  localeCookieName: typeof E2E_LOCALE_COOKIE_NAME;
  preferredLocaleCookieName: typeof E2E_PREFERRED_LOCALE_COOKIE_NAME;
  phone: {
    callingCode: string;
    e164Prefix: string;
    nationalDigits: number;
    mobileNationalPrefix: string;
  };
  descriptionTabSlot0TestId: typeof E2E_DESCRIPTION_TAB_SLOT0_TEST_ID;
};

export function resolveE2eCountryCode(): string {
  return (process.env.COUNTRY || process.env.NEXT_PUBLIC_COUNTRY || 'md').toLowerCase();
}

function resolvePhoneRegion(country: string): E2ePhoneRegion {
  return E2E_PHONE_REGIONS[country] ?? E2E_PHONE_REGIONS.md!;
}

export function buildE2ePlatformFromSite(
  site: SiteConfig,
  country = resolveE2eCountryCode(),
): E2ePlatform {
  const routing = site.localeRouting ?? {
    defaultLocale: 'ro',
    supportedLocales: ['ro', 'ru'] as const,
    prefixedLocales: ['ru'] as const,
    languageSwitcherTranslationKeys: {
      ro: 'common.languageRo',
      ru: 'common.languageRu',
    },
  };
  const phone = resolvePhoneRegion(country);

  return {
    country: site.country || country,
    countryCode: site.countryCode,
    domain: site.domain,
    browserLocale: site.locale,
    defaultLocale: routing.defaultLocale,
    supportedLocales: routing.supportedLocales,
    prefixedLocales: routing.prefixedLocales,
    languageSwitcherTranslationKeys: routing.languageSwitcherTranslationKeys ?? {},
    localeCookieName: E2E_LOCALE_COOKIE_NAME,
    preferredLocaleCookieName: E2E_PREFERRED_LOCALE_COOKIE_NAME,
    phone: {
      callingCode: phone.callingCode,
      e164Prefix: `+${phone.callingCode}`,
      nationalDigits: phone.nationalDigits,
      mobileNationalPrefix: phone.mobileNationalPrefix,
    },
    descriptionTabSlot0TestId: E2E_DESCRIPTION_TAB_SLOT0_TEST_ID,
  };
}

let cachedPlatform: E2ePlatform | null = null;
let cachedPlatformKey: string | null = null;

export function getE2ePlatform(): E2ePlatform {
  const country = resolveE2eCountryCode();
  if (cachedPlatform && cachedPlatformKey === country) {
    return cachedPlatform;
  }
  const site = loadSiteConfigSync(country);
  cachedPlatform = buildE2ePlatformFromSite(site, country);
  cachedPlatformKey = country;
  return cachedPlatform;
}

/** Test helper: clear cached platform (e.g. after changing COUNTRY in unit tests). */
export function resetE2ePlatformCache(): void {
  cachedPlatform = null;
  cachedPlatformKey = null;
}

export function buildUniquePlatformPhone(platform: E2ePlatform = getE2ePlatform()): string {
  const { e164Prefix, nationalDigits, mobileNationalPrefix } = platform.phone;
  const remaining = nationalDigits - mobileNationalPrefix.length;
  if (remaining <= 0) {
    throw new Error(
      `Invalid e2e phone region for ${platform.country}: nationalDigits=${nationalDigits}, prefix=${mobileNationalPrefix}`,
    );
  }
  const timePart = (Date.now() % 10 ** Math.min(3, remaining))
    .toString()
    .padStart(Math.min(3, remaining), '0');
  const randLen = remaining - timePart.length;
  const randPart =
    randLen > 0
      ? Math.floor(Math.random() * 10 ** randLen)
          .toString()
          .padStart(randLen, '0')
      : '';
  return `${e164Prefix}${mobileNationalPrefix}${timePart}${randPart}`;
}
