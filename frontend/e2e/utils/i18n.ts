import fs from 'node:fs';
import path from 'node:path';

import { getE2ePlatform } from '../platform/contract';

type LocaleTree = Record<string, unknown>;

let cachedBackendLocale: LocaleTree | null = null;
let cachedBackendLocaleCode: string | null = null;

function resolveLocaleValue(tree: LocaleTree, key: string, sourceLabel: string): string {
  const parts = key.split('.');
  let current: unknown = tree;
  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) {
      throw new Error(`Missing E2E ${sourceLabel} locale key: ${key}`);
    }
    current = (current as LocaleTree)[part];
  }
  if (typeof current !== 'string') {
    throw new Error(`E2E ${sourceLabel} locale key is not a string: ${key}`);
  }
  return current;
}

const frontendLocales = new Map<string, LocaleTree>();

function assertSupportedLocale(localeCode: string): string {
  const supported = getE2ePlatform().supportedLocales.map((item) => item.toLowerCase());
  const normalized = localeCode.toLowerCase();
  if (!supported.includes(normalized)) {
    throw new Error(`E2E locale is not in platform supportedLocales: ${localeCode}`);
  }
  return normalized;
}

function loadFrontendLocaleFor(localeCode: string): LocaleTree {
  const locale = assertSupportedLocale(localeCode);
  const cached = frontendLocales.get(locale);
  if (cached) {
    return cached;
  }
  const localePath = path.resolve(process.cwd(), `lib/locales/${locale}.json`);
  const tree = JSON.parse(fs.readFileSync(localePath, 'utf8')) as LocaleTree;
  frontendLocales.set(locale, tree);
  return tree;
}

function loadFrontendLocale(): LocaleTree {
  return loadFrontendLocaleFor(getE2ePlatform().defaultLocale);
}

function loadBackendLocale(): LocaleTree {
  const localeCode = getE2ePlatform().defaultLocale;
  if (cachedBackendLocale && cachedBackendLocaleCode === localeCode) {
    return cachedBackendLocale;
  }
  const localePath = path.resolve(process.cwd(), `../backend/src/common/i18n/${localeCode}.json`);
  cachedBackendLocale = JSON.parse(fs.readFileSync(localePath, 'utf8')) as LocaleTree;
  cachedBackendLocaleCode = localeCode;
  return cachedBackendLocale;
}

function interpolate(value: string, params?: Record<string, string | number>): string {
  if (!params) {
    return value;
  }
  let result = value;
  for (const [paramKey, paramValue] of Object.entries(params)) {
    result = result.replace(`{${paramKey}}`, String(paramValue));
  }
  return result;
}

export function t(key: string, params?: Record<string, string | number>): string {
  return interpolate(resolveLocaleValue(loadFrontendLocale(), key, 'frontend'), params);
}

export function tForLocale(
  locale: string,
  key: string,
  params?: Record<string, string | number>,
): string {
  return interpolate(resolveLocaleValue(loadFrontendLocaleFor(locale), key, 'frontend'), params);
}

export function tb(key: string): string {
  return resolveLocaleValue(loadBackendLocale(), key, 'backend');
}
