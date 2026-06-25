import fs from 'node:fs';
import path from 'node:path';

type LocaleTree = Record<string, unknown>;

let cachedRoLocale: LocaleTree | null = null;
let cachedBackendRoLocale: LocaleTree | null = null;

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

function loadRoLocale(): LocaleTree {
  if (cachedRoLocale) {
    return cachedRoLocale;
  }
  const localePath = path.resolve(process.cwd(), 'lib/locales/ro.json');
  cachedRoLocale = JSON.parse(fs.readFileSync(localePath, 'utf8')) as LocaleTree;
  return cachedRoLocale;
}

function loadBackendRoLocale(): LocaleTree {
  if (cachedBackendRoLocale) {
    return cachedBackendRoLocale;
  }
  const localePath = path.resolve(process.cwd(), '../backend/src/common/i18n/ro.json');
  cachedBackendRoLocale = JSON.parse(fs.readFileSync(localePath, 'utf8')) as LocaleTree;
  return cachedBackendRoLocale;
}

export function t(key: string, params?: Record<string, string | number>): string {
  let value = resolveLocaleValue(loadRoLocale(), key, 'frontend');
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(`{${paramKey}}`, String(paramValue));
    }
  }
  return value;
}

export function tb(key: string): string {
  return resolveLocaleValue(loadBackendRoLocale(), key, 'backend');
}
