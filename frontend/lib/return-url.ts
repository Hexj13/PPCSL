import { getClientLocale, getDefaultLocale } from './i18n';
import type { Locale } from './i18n-types';
import { localePrefixPath, stripLocalePrefixFromPathname } from './url-locale';

const AUTH_PATH_PREFIXES = [
  '/sign',
  '/login',
  '/register',
  '/reset-password',
  '/verify-email',
  '/verify-phone',
];

function isAuthPath(path: string): boolean {
  return AUTH_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}?`));
}

function resolveLocaleForAuthNavigation(locale?: Locale): Locale {
  if (locale !== undefined) {
    return locale;
  }
  if (typeof window !== 'undefined') {
    return getClientLocale();
  }
  return getDefaultLocale();
}

function withAuthPathLocale(href: string, locale?: Locale): string {
  return localePrefixPath(href, resolveLocaleForAuthNavigation(locale));
}

export function sanitizeReturnUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//')) return null;
  const { restPath } = stripLocalePrefixFromPathname(value);
  if (isAuthPath(restPath)) return null;
  return value;
}

export function buildSignInHref(returnUrl?: string | null, locale?: Locale): string {
  const safe = sanitizeReturnUrl(returnUrl);
  const base = !safe ? '/sign' : `/sign?returnUrl=${encodeURIComponent(safe)}`;
  return withAuthPathLocale(base, locale);
}

export function appendReturnUrl(path: string, returnUrl?: string | null): string {
  const safe = sanitizeReturnUrl(returnUrl);
  if (!safe) return path;
  const params = new URLSearchParams();
  params.set('returnUrl', safe);
  return `${path}?${params.toString()}`;
}

export function getReturnUrlFromSearchParams(
  searchParams: Pick<URLSearchParams, 'get'>,
): string | null {
  return sanitizeReturnUrl(searchParams.get('returnUrl'));
}

export function buildSignPageHref(options: {
  tab: 'login' | 'register';
  returnUrl?: string | null;
  locale?: Locale;
}): string {
  const params = new URLSearchParams();
  if (options.tab === 'register') {
    params.set('tab', 'register');
  }
  const safe = sanitizeReturnUrl(options.returnUrl ?? null);
  if (safe) {
    params.set('returnUrl', safe);
  }
  const query = params.toString();
  const base = query ? `/sign?${query}` : '/sign';
  return withAuthPathLocale(base, options.locale);
}
