import type { Locale } from './i18n-types';
import {
  isLanguageSwitcherEnabledEnv,
  resolveLocaleRouting,
  type ResolvedLocaleRouting,
} from './locale-routing';
import { loadSiteConfigSync } from './site-config';
import { getCountry } from './utils';

export const URL_LOCALE_HEADER = 'x-kupito-url-locale';

function getRouting(): ResolvedLocaleRouting {
  return resolveLocaleRouting(loadSiteConfigSync(getCountry()));
}

function escapeReSegment(seg: string): string {
  return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPrefixedLocalesPattern(prefixedLocales: readonly string[]): RegExp | null {
  if (!prefixedLocales.length) return null;
  const body = prefixedLocales.map((s) => escapeReSegment(s)).join('|');
  return new RegExp(`^/(?:${body})(?=/|$)`, 'i');
}

export function pathnameHasPrefixedLocale(
  pathname: string,
  routing?: ResolvedLocaleRouting,
): boolean {
  const r = routing ?? getRouting();
  const re = buildPrefixedLocalesPattern(r.prefixedLocales);
  return re ? re.test(pathname) : false;
}

export const RU_URL_PREFIX_RE = /^\/ru(?=\/|$)/i;

export function pathnameHasRuPrefix(pathname: string): boolean {
  return pathnameHasPrefixedLocale(pathname);
}

export function stripPrefixedLocaleFromPathname(
  pathname: string,
  routing?: ResolvedLocaleRouting,
): {
  hasPrefix: boolean;
  restPath: string;
  matchedPrefix: string;
  matchedLocale: string;
} {
  const r = routing ?? getRouting();
  const re = buildPrefixedLocalesPattern(r.prefixedLocales);
  if (!re) {
    return { hasPrefix: false, restPath: pathname || '/', matchedPrefix: '', matchedLocale: '' };
  }
  const m = pathname.match(re);
  if (!m) {
    return { hasPrefix: false, restPath: pathname || '/', matchedPrefix: '', matchedLocale: '' };
  }
  const matchedPrefix = m[0];
  const seg = matchedPrefix.slice(1).split('/')[0]?.toLowerCase() ?? '';
  const rest = pathname.slice(matchedPrefix.length);
  const restPath = rest === '' || rest === '/' ? '/' : rest.startsWith('/') ? rest : `/${rest}`;
  return { hasPrefix: true, restPath, matchedPrefix, matchedLocale: seg };
}

export function stripRuPrefixFromPathname(pathname: string): {
  hasRu: boolean;
  restPath: string;
  matchedPrefix: string;
} {
  const { hasPrefix, restPath, matchedPrefix } = stripPrefixedLocaleFromPathname(pathname);
  return { hasRu: hasPrefix, restPath, matchedPrefix };
}

export function canonicalLowercasePrefixedPathname(
  pathname: string,
  routing?: ResolvedLocaleRouting,
): string | null {
  const r = routing ?? getRouting();
  const { hasPrefix, restPath, matchedPrefix, matchedLocale } = stripPrefixedLocaleFromPathname(
    pathname,
    r,
  );
  if (!hasPrefix) return null;
  const canonicalSeg = `/${matchedLocale}`;
  if (matchedPrefix === canonicalSeg) {
    return null;
  }
  if (restPath === '/') {
    return canonicalSeg;
  }
  return `${canonicalSeg}${restPath.startsWith('/') ? restPath : `/${restPath}`}`;
}

export function canonicalLowercaseRuPathname(pathname: string): string | null {
  return canonicalLowercasePrefixedPathname(pathname);
}

export function isLanguageSwitcherEnabled(): boolean {
  return isLanguageSwitcherEnabledEnv();
}

function normalizePathAndQuery(restPath: string): { pathPart: string; query: string } {
  const qIdx = restPath.indexOf('?');
  const pathPart = qIdx >= 0 ? restPath.slice(0, qIdx) : restPath;
  const query = qIdx >= 0 ? restPath.slice(qIdx) : '';
  const normalized = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  return { pathPart: normalized === '//' ? '/' : normalized, query };
}

export function localePrefixPath(
  restPath: string,
  locale: Locale,
  routing?: ResolvedLocaleRouting,
): string {
  const r = routing ?? getRouting();
  const { pathPart, query } = normalizePathAndQuery(restPath);
  const loc = String(locale).toLowerCase();

  const stripAllPrefixes = (p: string): string => {
    let cur = p;
    let guard = 0;
    while (guard < 8) {
      guard += 1;
      const { hasPrefix, restPath: inner } = stripPrefixedLocaleFromPathname(cur, r);
      if (!hasPrefix) break;
      cur = inner === '' ? '/' : inner.startsWith('/') ? inner : `/${inner}`;
    }
    return cur;
  };

  const innerPath = stripAllPrefixes(pathPart);

  if (loc === r.defaultLocale) {
    const out = innerPath === '/' ? '/' : innerPath;
    return `${out}${query}`;
  }

  if (!r.prefixedLocales.map((x) => x.toLowerCase()).includes(loc)) {
    const out = innerPath === '/' ? '/' : innerPath;
    return `${out}${query}`;
  }

  const base = innerPath === '/' ? '' : innerPath;
  const prefixedRoot = `/${loc}`;
  if (base === '') {
    return query ? `${prefixedRoot}/${query}` : prefixedRoot;
  }
  return `${prefixedRoot}${base.startsWith('/') ? base : `/${base}`}${query}`;
}

export function stripLocalePrefixFromPathname(
  pathname: string,
  routing?: ResolvedLocaleRouting,
): {
  locale: Locale;
  restPath: string;
} {
  const r = routing ?? getRouting();
  const { hasPrefix, restPath, matchedLocale } = stripPrefixedLocaleFromPathname(pathname, r);
  if (hasPrefix && r.supportedLocales.map((x) => x.toLowerCase()).includes(matchedLocale)) {
    return { locale: matchedLocale as Locale, restPath };
  }
  return { locale: r.defaultLocale as Locale, restPath: pathname || '/' };
}

export function absoluteUrlWithLocalePrefix(
  siteUrl: string,
  restPathAndQuery: string,
  locale: Locale,
  routing?: ResolvedLocaleRouting,
): string {
  const base = siteUrl.replace(/\/$/, '');
  const prefixed = localePrefixPath(restPathAndQuery, locale, routing);
  if (prefixed === '/') {
    return `${base}/`;
  }
  const r = routing ?? getRouting();
  for (const seg of r.prefixedLocales) {
    const p = `/${seg.toLowerCase()}`;
    if (prefixed === p) {
      return `${base}${p}`;
    }
  }
  return `${base}${prefixed}`;
}

export function defaultCanonicalToPrefixedAbsolute(
  defaultCanonicalAbsolute: string,
  prefixedLocale: string,
  routing?: ResolvedLocaleRouting,
): string {
  const r = routing ?? getRouting();
  const loc = String(prefixedLocale).toLowerCase();
  if (!r.prefixedLocales.map((x) => x.toLowerCase()).includes(loc)) {
    return defaultCanonicalAbsolute;
  }
  const u = new URL(defaultCanonicalAbsolute);
  const pathAndQuery = `${u.pathname}${u.search}`;
  const next = localePrefixPath(pathAndQuery, loc as Locale, r);
  return `${u.origin}${next}`;
}

export function roCanonicalToAbsoluteRu(
  roCanonicalAbsolute: string,
  routing?: ResolvedLocaleRouting,
): string {
  const r = routing ?? getRouting();
  const ru = r.prefixedLocales.find((x) => x.toLowerCase() === 'ru') ?? 'ru';
  return defaultCanonicalToPrefixedAbsolute(roCanonicalAbsolute, ru, r);
}

export function canonicalForLocaleFromRo(
  roCanonicalAbsolute: string,
  locale: Locale,
  routing?: ResolvedLocaleRouting,
): string {
  const r = routing ?? getRouting();
  const loc = String(locale).toLowerCase();
  if (loc === r.defaultLocale) {
    return roCanonicalAbsolute;
  }
  return defaultCanonicalToPrefixedAbsolute(roCanonicalAbsolute, loc, r);
}

export function hreflangLanguagesFromRoCanonical(
  roCanonicalAbsolute: string,
  routing?: ResolvedLocaleRouting,
): Record<string, string> {
  const r = routing ?? getRouting();
  const out: Record<string, string> = {};
  for (const loc of r.supportedLocales) {
    const low = loc.toLowerCase();
    out[low] = canonicalForLocaleFromRo(roCanonicalAbsolute, low as Locale, r);
  }
  out['x-default'] = roCanonicalAbsolute;
  return out;
}

export function localizeAbsoluteUrl(
  absoluteUrl: string | undefined,
  locale: Locale,
  routing?: ResolvedLocaleRouting,
): string | undefined {
  if (!absoluteUrl) {
    return undefined;
  }
  const r = routing ?? getRouting();
  const loc = String(locale).toLowerCase();
  if (loc === r.defaultLocale) {
    return absoluteUrl;
  }
  return defaultCanonicalToPrefixedAbsolute(absoluteUrl, loc, r);
}

export function homeOgAbsoluteUrl(
  siteUrl: string,
  urlSuffix: string,
  locale: Locale,
  routing?: ResolvedLocaleRouting,
): string {
  const base = siteUrl.replace(/\/$/, '');
  const roAbs = urlSuffix ? `${base}/${urlSuffix}` : `${base}/`;
  return canonicalForLocaleFromRo(roAbs, locale, routing);
}

export function getLocaleFromPathname(
  pathname: string,
  routing?: ResolvedLocaleRouting,
): Locale | null {
  const r = routing ?? getRouting();
  const { hasPrefix, matchedLocale } = stripPrefixedLocaleFromPathname(pathname, r);
  if (!hasPrefix) return null;
  if (!r.supportedLocales.map((x) => x.toLowerCase()).includes(matchedLocale)) return null;
  return matchedLocale as Locale;
}
