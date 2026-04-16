import { localStorageGetItem, localStorageSetItem } from './browser-local-storage';
import type { Locale, Translations } from './i18n-types';
export type { Locale, Translations } from './i18n-types';
import { loadSiteConfigSync } from './site-config';
import { getCountry } from './utils';

const STORAGE_KEY = 'kupito-locale';
const COOKIE_KEY = 'kupito-locale';

let roTranslations: Translations | null = null;
let ruTranslations: Translations | null = null;

function createEmptyTranslations(): Translations {
  const handler: ProxyHandler<object> = {
    get: (_target, _prop) => {
      return new Proxy({}, handler);
    },
  };
  return new Proxy({} as object, handler) as Translations;
}

function loadRoTranslations(): Translations {
  if (roTranslations) {
    return roTranslations;
  }

  if (typeof window !== 'undefined') {
    return createEmptyTranslations();
  }

  try {
    const translations = require('./locales/ro.json');
    roTranslations = translations as unknown as Translations;
    return roTranslations;
  } catch {
    console.warn(
      'Translations file ro.json not found, using empty translations. This is expected in core repository.',
    );
    roTranslations = createEmptyTranslations();
    return roTranslations;
  }
}

function loadRuTranslations(): Translations {
  if (ruTranslations) {
    return ruTranslations;
  }

  if (typeof window !== 'undefined') {
    return createEmptyTranslations();
  }

  try {
    const translations = require('./locales/ru.json');
    ruTranslations = translations as unknown as Translations;
    return ruTranslations;
  } catch {
    console.warn(
      'Translations file ru.json not found, using empty translations. This is expected in core repository.',
    );
    ruTranslations = createEmptyTranslations();
    return ruTranslations;
  }
}

export async function loadTranslationsDynamic(locale: Locale): Promise<Translations> {
  if (locale === 'ru') {
    if (ruTranslations) return ruTranslations;
    try {
      const translations = require('./locales/ru.json');
      ruTranslations = translations as unknown as Translations;
      return ruTranslations;
    } catch {
      return createEmptyTranslations();
    }
  }
  if (roTranslations) return roTranslations;
  try {
    const translations = require('./locales/ro.json');
    roTranslations = translations as unknown as Translations;
    return roTranslations;
  } catch {
    return createEmptyTranslations();
  }
}

export function getDefaultLocale(): Locale {
  try {
    const siteConfig = loadSiteConfigSync(getCountry());
    return siteConfig.locale.split('-')[0] as Locale;
  } catch {
    return 'ro';
  }
}

export function getStoredLocale(): Locale {
  const enableLanguageSwitcher = process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER === 'true';

  if (!enableLanguageSwitcher) {
    return getDefaultLocale();
  }

  if (typeof window === 'undefined') {
    return getDefaultLocale();
  }

  try {
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${COOKIE_KEY}=`))
      ?.split('=')[1];

    if (cookieValue && (cookieValue === 'ro' || cookieValue === 'ru')) {
      return cookieValue as Locale;
    }

    const stored = localStorageGetItem(STORAGE_KEY);
    if (stored && (stored === 'ro' || stored === 'ru')) {
      return stored as Locale;
    }
  } catch {}

  return getDefaultLocale();
}

export function setStoredLocale(locale: Locale): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorageSetItem(STORAGE_KEY, locale);

  const maxAge = 365 * 24 * 60 * 60;
  document.cookie = `${COOKIE_KEY}=${locale}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function applyPreferredLocaleFromProfile(preferredLocale: string | null | undefined): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (preferredLocale === 'ro' || preferredLocale === 'ru') {
    setStoredLocale(preferredLocale);
  }
}

export function loadTranslations(locale?: Locale): Translations {
  if (!locale) {
    locale = getDefaultLocale();
  }

  if (locale === 'ru') {
    return loadRuTranslations();
  }

  return loadRoTranslations();
}

export function getServerTranslations(locale?: Locale): Translations {
  if (!locale) {
    locale = getDefaultLocale();
  }
  return loadTranslations(locale);
}

export async function getMetadataLocale(): Promise<Locale> {
  const defaultLocale = getDefaultLocale();
  if (process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER !== 'true') {
    return defaultLocale;
  }
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('kupito-locale')?.value;
  if (localeCookie && (localeCookie === 'ro' || localeCookie === 'ru')) {
    return localeCookie as Locale;
  }
  return defaultLocale;
}

export function getTFromTranslations(translations: Translations): (_key: string) => string {
  return (keyPath: string) => {
    const keys = keyPath.split('.');
    let value: unknown = translations;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return keyPath;
      }
    }
    return typeof value === 'string' ? value : keyPath;
  };
}

export async function loadTranslationsAsync(locale: Locale): Promise<Translations> {
  return loadTranslations(locale);
}
