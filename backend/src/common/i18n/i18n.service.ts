import { readFileSync } from 'fs';
import { join } from 'path';

import { Injectable } from '@nestjs/common';

type Translations = Record<string, string | Record<string, unknown>>;

const SUPPORTED_LOCALES = ['ro', 'ru', 'en', 'sq'] as const;

type OverlayLocaleRouting = {
  defaultLocale?: string;
  supportedLocales?: string[];
};

function parseLocaleList(raw?: string | string[]): string[] {
  const parts = Array.isArray(raw) ? raw : (raw ?? '').split(',');
  return parts
    .map((value) => value.trim().toLowerCase())
    .filter((value) => (SUPPORTED_LOCALES as readonly string[]).includes(value));
}

export function loadOverlayLocaleRouting(): OverlayLocaleRouting {
  try {
    // Overlay copied by platform `prepare:build`; absent in a bare PPCSL checkout.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require('../config/site') as {
      default?: { localeRouting?: OverlayLocaleRouting };
      localeRouting?: OverlayLocaleRouting;
    };
    const routing = loaded.default?.localeRouting ?? loaded.localeRouting;
    return {
      defaultLocale: routing?.defaultLocale?.toLowerCase(),
      supportedLocales: routing?.supportedLocales?.map((locale) => locale.toLowerCase()),
    };
  } catch {
    return {};
  }
}

export function resolveI18nDefaultLocale(envLocale?: string, overlayDefault?: string): string {
  const env = envLocale?.toLowerCase();
  if (env && (SUPPORTED_LOCALES as readonly string[]).includes(env)) {
    return env;
  }
  const overlay = overlayDefault?.toLowerCase();
  if (overlay && (SUPPORTED_LOCALES as readonly string[]).includes(overlay)) {
    return overlay;
  }
  return 'en';
}

export function resolveI18nLocalesToLoad(options: {
  defaultLocale: string;
  supportedLocalesEnv?: string;
  overlaySupportedLocales?: string[];
}): string[] {
  const fromEnv = parseLocaleList(options.supportedLocalesEnv);
  const fromOverlay = parseLocaleList(options.overlaySupportedLocales);
  const selected = fromEnv.length > 0 ? fromEnv : fromOverlay;
  const set = new Set(selected);
  if (selected.length === 0) {
    set.add('en');
  }
  if ((SUPPORTED_LOCALES as readonly string[]).includes(options.defaultLocale)) {
    set.add(options.defaultLocale);
  }
  return SUPPORTED_LOCALES.filter((locale) => set.has(locale));
}

export function interpolateI18nTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{${key}}`).join(value);
  }
  return result;
}

export function resolveI18nBundleLocales(requested: string, defaultLocale: string): string[] {
  const locales: string[] = [];
  for (const locale of [requested, defaultLocale, 'en']) {
    if (locale && !locales.includes(locale)) {
      locales.push(locale);
    }
  }
  return locales;
}

@Injectable()
export class I18nService {
  private translations: Map<string, Translations> = new Map();
  private defaultLocale: string;

  constructor() {
    const overlay = loadOverlayLocaleRouting();
    this.defaultLocale = resolveI18nDefaultLocale(
      process.env.DEFAULT_LOCALE,
      overlay.defaultLocale,
    );

    const localesToLoad = resolveI18nLocalesToLoad({
      defaultLocale: this.defaultLocale,
      supportedLocalesEnv: process.env.SUPPORTED_LOCALES,
      overlaySupportedLocales: overlay.supportedLocales,
    });
    for (const locale of localesToLoad) {
      this.loadTranslations(locale);
    }
  }

  private loadTranslations(locale: string): void {
    const possiblePaths = [
      join(__dirname, 'i18n', `${locale}.json`),
      join(process.cwd(), 'src', 'common', 'i18n', `${locale}.json`),
      join(process.cwd(), 'dist', 'common', 'i18n', `${locale}.json`),
    ];

    for (const filePath of possiblePaths) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        this.translations.set(locale, JSON.parse(content));
        return;
      } catch {
        // Try next path
      }
    }

    console.warn(`Failed to load translations for locale: ${locale} from any path`);
  }

  translate(key: string, locale?: string): string {
    const envLocale = process.env.DEFAULT_LOCALE?.toLowerCase();
    const effectiveLocale = locale || envLocale || this.defaultLocale;
    let translations: Translations | undefined;
    for (const candidate of resolveI18nBundleLocales(effectiveLocale, this.defaultLocale)) {
      translations = this.translations.get(candidate);
      if (translations) break;
    }

    if (!translations) {
      return key;
    }

    const keys = key.split('.');
    let value: string | Record<string, unknown> = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && !Array.isArray(value) && k in value) {
        const nextValue = value[k];
        if (
          typeof nextValue === 'string' ||
          (typeof nextValue === 'object' && nextValue !== null)
        ) {
          value = nextValue as string | Record<string, unknown>;
        } else {
          return key;
        }
      } else {
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  }

  getLocaleFromHeader(acceptLanguage?: string): string {
    if (acceptLanguage) {
      const languages = acceptLanguage
        .split(',')
        .map((lang) => {
          const parts = lang.trim().split(';');
          const locale = parts[0] || '';
          const q = parts[1] || 'q=1';
          const qualityStr = q.trim().toLowerCase().replace(/^q=/, '');
          const quality = qualityStr ? parseFloat(qualityStr) : 1.0;
          return {
            locale: locale.split('-')[0].toLowerCase(),
            quality: isNaN(quality) ? 1.0 : quality,
          };
        })
        .filter((lang) => lang.locale)
        .sort((a, b) => b.quality - a.quality);

      for (const { locale } of languages) {
        if (this.translations.has(locale)) {
          return locale;
        }
      }
    }

    const envLocale = process.env.DEFAULT_LOCALE?.toLowerCase();
    if (
      envLocale &&
      (SUPPORTED_LOCALES as readonly string[]).includes(envLocale) &&
      this.translations.has(envLocale)
    ) {
      return envLocale;
    }

    return this.defaultLocale;
  }
}
