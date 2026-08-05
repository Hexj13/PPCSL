import fs from 'node:fs';
import path from 'node:path';

import { getE2ePlatform } from '../platform/contract';

type LocaleTree = Record<string, unknown>;

let cachedFrontendLocale: LocaleTree | null = null;
let cachedFrontendLocaleCode: string | null = null;
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

function loadFrontendLocale(): LocaleTree {
  const localeCode = getE2ePlatform().defaultLocale;
  if (cachedFrontendLocale && cachedFrontendLocaleCode === localeCode) {
    return cachedFrontendLocale;
  }
  const localePath = path.resolve(process.cwd(), `lib/locales/${localeCode}.json`);
  cachedFrontendLocale = JSON.parse(fs.readFileSync(localePath, 'utf8')) as LocaleTree;
  cachedFrontendLocaleCode = localeCode;
  return cachedFrontendLocale;
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

export function t(key: string, params?: Record<string, string | number>): string {
  let value = resolveLocaleValue(loadFrontendLocale(), key, 'frontend');
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(`{${paramKey}}`, String(paramValue));
    }
  }
  return value;
}

export function tb(key: string): string {
  return resolveLocaleValue(loadBackendLocale(), key, 'backend');
}
