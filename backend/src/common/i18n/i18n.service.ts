import { readFileSync } from 'fs';
import { join } from 'path';

import { Injectable } from '@nestjs/common';

type Translations = Record<string, string | Record<string, unknown>>;

@Injectable()
export class I18nService {
  private translations: Map<string, Translations> = new Map();
  private defaultLocale: string;

  constructor() {
    const envLocale = process.env.DEFAULT_LOCALE?.toLowerCase();
    this.defaultLocale =
      envLocale && ['ro', 'ru', 'mk', 'en'].includes(envLocale) ? envLocale : 'ro';

    this.loadTranslations('ro');
    this.loadTranslations('ru');
    this.loadTranslations('mk');
    this.loadTranslations('en');
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
    let translations = this.translations.get(effectiveLocale);
    if (!translations) {
      translations = this.translations.get(this.defaultLocale);
    }
    if (!translations) {
      translations = this.translations.get('ro');
    }
    if (!translations) {
      translations = this.translations.get('en');
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
    const envLocale = process.env.DEFAULT_LOCALE?.toLowerCase();
    if (
      envLocale &&
      ['ro', 'ru', 'mk', 'en'].includes(envLocale) &&
      this.translations.has(envLocale)
    ) {
      return envLocale;
    }

    if (!acceptLanguage) {
      return this.defaultLocale;
    }

    const languages = acceptLanguage
      .split(',')
      .map((lang) => {
        const [locale, q = 'q=1'] = lang.trim().split(';');
        const quality = parseFloat(q.replace('q=', ''));
        return { locale: locale.split('-')[0].toLowerCase(), quality };
      })
      .sort((a, b) => b.quality - a.quality);

    for (const { locale } of languages) {
      if (this.translations.has(locale)) {
        return locale;
      }
    }

    return this.defaultLocale;
  }
}
