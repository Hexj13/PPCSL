import { localStorageGetItem, localStorageSetItem } from './browser-local-storage';
import type { Locale, Translations } from './i18n-types';
export type { Locale, Translations } from './i18n-types';
import { resolveLocaleRouting } from './locale-routing';
import { loadSiteConfigSync } from './site-config';
import { getLocaleFromPathname, isLanguageSwitcherEnabled, URL_LOCALE_HEADER } from './url-locale';
import { getCountry } from './utils';

const STORAGE_KEY = 'kupito-locale';
const COOKIE_KEY = 'kupito-locale';
export const PREFERRED_LOCALE_COOKIE_KEY = 'kupito-preferred-locale';

const translationCache = new Map<string, Translations>();

function getRouting() {
  return resolveLocaleRouting(loadSiteConfigSync(getCountry()));
}

function supportedLocaleSet(): Set<string> {
  return new Set(getRouting().supportedLocales.map((x) => x.toLowerCase()));
}

function pickKnownLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const low = value.toLowerCase();
  return supportedLocaleSet().has(low) ? low : null;
}

function readBrowserCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const parts = document.cookie.split(';');
  for (let i = 0; i < parts.length; i += 1) {
    let part = parts[i];
    while (part.startsWith(' ')) {
      part = part.slice(1);
    }
    if (!part.startsWith(prefix)) continue;
    const raw = part.slice(prefix.length);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

function createEmptyTranslations(): Translations {
  const handler: ProxyHandler<object> = {
    get: (_target, prop) => {
      if (prop === Symbol.toPrimitive) {
        return () => '';
      }
      if (prop === 'toString') {
        return () => '';
      }
      if (prop === 'valueOf') {
        return () => '';
      }
      return new Proxy({}, handler);
    },
  };
  return new Proxy({} as object, handler) as Translations;
}

function requireTranslations(locale: string): Translations {
  const low = locale.toLowerCase();
  const cached = translationCache.get(low);
  if (cached) {
    return cached;
  }

  if (typeof window !== 'undefined') {
    return createEmptyTranslations();
  }

  try {
    const translations = require(`./locales/${low}.json`) as Translations;
    translationCache.set(low, translations);
    return translations;
  } catch {
    console.warn(
      `Translations file ${low}.json not found, using empty translations. This is expected in core repository.`,
    );
    const empty = createEmptyTranslations();
    translationCache.set(low, empty);
    return empty;
  }
}

export async function loadTranslationsDynamic(locale: Locale): Promise<Translations> {
  const def = getDefaultLocale();
  const raw = String(locale).toLowerCase();
  const loc = supportedLocaleSet().has(raw) ? raw : def;
  const cached = translationCache.get(loc);
  if (cached) {
    return cached;
  }
  try {
    const translations = require(`./locales/${loc}.json`) as Translations;
    translationCache.set(loc, translations);
    return translations;
  } catch {
    return createEmptyTranslations();
  }
}

export function getDefaultLocale(): Locale {
  try {
    return getRouting().defaultLocale;
  } catch {
    return 'ro';
  }
}

export function getClientLocale(pathnameForRouting?: string): Locale {
  if (!isLanguageSwitcherEnabled()) {
    return getDefaultLocale();
  }

  const pathForUrlLocale =
    typeof pathnameForRouting === 'string' && pathnameForRouting.trim()
      ? pathnameForRouting
      : typeof window !== 'undefined'
        ? window.location.pathname
        : '';

  try {
    if (pathForUrlLocale) {
      const fromUrl = getLocaleFromPathname(pathForUrlLocale);
      if (fromUrl) return fromUrl;
    }
  } catch {}

  if (typeof window === 'undefined') {
    return getDefaultLocale();
  }

  const fromCookie = pickKnownLocale(readBrowserCookie(COOKIE_KEY));
  if (fromCookie) return fromCookie;

  const fromLs = pickKnownLocale(localStorageGetItem(STORAGE_KEY) ?? undefined);
  if (fromLs) return fromLs;

  return getDefaultLocale();
}

export function getStoredLocale(): Locale {
  return getClientLocale();
}

export function setStoredLocale(locale: Locale): void {
  if (typeof window === 'undefined') {
    return;
  }

  const picked = pickKnownLocale(locale);
  if (!picked) {
    return;
  }

  localStorageSetItem(STORAGE_KEY, picked);

  const maxAge = 365 * 24 * 60 * 60;
  document.cookie = `${COOKIE_KEY}=${picked}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `${PREFERRED_LOCALE_COOKIE_KEY}=${picked}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function applyPreferredLocaleFromProfile(preferredLocale: string | null | undefined): void {
  if (typeof window === 'undefined') {
    return;
  }
  const picked = pickKnownLocale(preferredLocale ?? undefined);
  if (picked) {
    setStoredLocale(picked);
  }
}

export function loadTranslations(locale?: Locale): Translations {
  const def = getDefaultLocale();
  const raw = locale !== undefined ? String(locale).toLowerCase() : def;
  const loc = supportedLocaleSet().has(raw) ? raw : def;
  return requireTranslations(loc);
}

export function getServerTranslations(locale?: Locale): Translations {
  return loadTranslations(locale);
}

export async function getMetadataLocale(): Promise<Locale> {
  const defaultLocale = getDefaultLocale();
  if (!isLanguageSwitcherEnabled()) {
    return defaultLocale;
  }
  const supported = supportedLocaleSet();
  const { headers } = await import('next/headers');
  const headerLocale = (await headers()).get(URL_LOCALE_HEADER)?.toLowerCase();
  if (headerLocale && supported.has(headerLocale)) {
    return headerLocale;
  }
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('kupito-locale')?.value?.toLowerCase();
  if (localeCookie && supported.has(localeCookie)) {
    return localeCookie;
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
