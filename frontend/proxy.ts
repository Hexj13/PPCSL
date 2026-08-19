import { jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { ACCESS_TOKEN_COOKIE_NAME } from '@/lib/auth-access-cookie';
import { resolveLocaleRouting } from '@/lib/locale-routing';
import { isPhoneVerificationExemptRestPath } from '@/lib/phone-verification-paths';
import { sanitizeReturnUrl } from '@/lib/return-url';
import { loadSiteConfigSync } from '@/lib/site-config';
import {
  canonicalLowercasePrefixedPathname,
  getLocaleFromPathname,
  headersWithUrlPathname,
  isLanguageSwitcherEnabled,
  stripPrefixedLocaleFromPathname,
} from '@/lib/url-locale';
import { getCountry } from '@/lib/utils';

function withUrlPathnameRequest(request: NextRequest): {
  request: { headers: Headers };
} {
  return {
    request: { headers: headersWithUrlPathname(request.headers, request.nextUrl.pathname) },
  };
}

function getRouting() {
  return resolveLocaleRouting(loadSiteConfigSync(getCountry()));
}

function passthroughIfExcludedPath(pathname: string): NextResponse | null {
  if (pathname.startsWith('/.well-known/')) {
    return NextResponse.next();
  }
  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }
  if (
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/sitemap.txt' ||
    pathname.startsWith('/sitemaps/')
  ) {
    return NextResponse.next();
  }
  if (/\.(?:ico|png|jpg|jpeg|gif|webp|svg|json|webmanifest)$/i.test(pathname)) {
    return NextResponse.next();
  }
  return null;
}

function redirectLegacyDefaultLocalePath(
  request: NextRequest,
  pathname: string,
  search: string,
  routing: ReturnType<typeof getRouting>,
): NextResponse | null {
  if (!routing.enableLegacyDefaultLocaleRedirect) {
    return null;
  }
  const prefixedSet = new Set(routing.prefixedLocales.map((x) => x.toLowerCase()));
  if (prefixedSet.has(routing.defaultLocale)) {
    return null;
  }
  const seg = routing.defaultLocale.toLowerCase();
  const prefix = `/${seg}`;
  if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
    return null;
  }
  const destPath = pathname === prefix ? '/' : pathname.slice(prefix.length) || '/';
  const url = request.nextUrl.clone();
  url.pathname = destPath.startsWith('/') ? destPath : `/${destPath}`;
  url.search = search;
  return NextResponse.redirect(url, 308);
}

function rewriteUnprefixedToDefaultLocale(
  request: NextRequest,
  pathname: string,
  search: string,
  routing: ReturnType<typeof getRouting>,
): NextResponse {
  const locale = routing.defaultLocale;
  const url = request.nextUrl.clone();
  const suffix = pathname === '/' ? '' : pathname;
  url.pathname = `/${locale}${suffix}`;
  url.search = search;
  return NextResponse.rewrite(url, withUrlPathnameRequest(request));
}

function handleLanguageSwitcherDisabled(
  request: NextRequest,
  pathname: string,
  search: string,
  routing: ReturnType<typeof getRouting>,
): NextResponse | null {
  const { hasPrefix, restPath } = stripPrefixedLocaleFromPathname(pathname, routing);
  if (!hasPrefix) {
    return rewriteUnprefixedToDefaultLocale(request, pathname, search, routing);
  }
  const destPath = restPath;
  const url = request.nextUrl.clone();
  url.pathname = destPath.startsWith('/') ? destPath : `/${destPath}`;
  url.search = search;
  return NextResponse.redirect(url, 308);
}

function redirectPrefixedWrongCase(
  request: NextRequest,
  pathname: string,
  search: string,
  routing: ReturnType<typeof getRouting>,
): NextResponse | null {
  const canonical = canonicalLowercasePrefixedPathname(pathname, routing);
  if (!canonical) {
    return null;
  }
  const url = request.nextUrl.clone();
  url.pathname = canonical;
  url.search = search;
  return NextResponse.redirect(url, 308);
}

function redirectPreferredPrefixedLocale(
  request: NextRequest,
  pathname: string,
  search: string,
  routing: ReturnType<typeof getRouting>,
): NextResponse | null {
  if (getLocaleFromPathname(pathname, routing)) {
    return null;
  }
  const localeCookie = request.cookies.get('ppcsl-locale')?.value?.toLowerCase() ?? null;
  const preferredCookie =
    request.cookies.get('ppcsl-preferred-locale')?.value?.toLowerCase() ?? null;
  const target = localeCookie ?? preferredCookie;
  if (!target) {
    return null;
  }
  if (target === routing.defaultLocale) {
    return null;
  }
  const prefixedSet = new Set(routing.prefixedLocales.map((x) => x.toLowerCase()));
  if (!prefixedSet.has(target)) {
    return null;
  }
  if (
    pathname === '/robots.txt' ||
    pathname.startsWith('/sitemap') ||
    pathname.startsWith('/sitemaps/')
  ) {
    return null;
  }
  const url = request.nextUrl.clone();
  url.pathname = `/${target}${pathname === '/' ? '' : pathname}`;
  url.search = search;
  return NextResponse.redirect(url, 307);
}

async function enforcePhoneVerifiedCookie(
  request: NextRequest,
  pathname: string,
  search: string,
  routing: ReturnType<typeof getRouting>,
): Promise<NextResponse | null> {
  const { restPath, hasPrefix, matchedPrefix } = stripPrefixedLocaleFromPathname(pathname, routing);
  if (isPhoneVerificationExemptRestPath(restPath)) {
    return null;
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return null;
  }
  const raw = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  if (!raw) {
    return null;
  }
  let phoneVerified: boolean | undefined;
  try {
    const { payload } = await jwtVerify(raw, new TextEncoder().encode(secret));
    phoneVerified = payload.phoneVerified as boolean | undefined;
  } catch {
    return null;
  }
  if (phoneVerified === true) {
    return null;
  }
  const url = request.nextUrl.clone();
  url.pathname = hasPrefix ? `${matchedPrefix}/complete-profile` : '/complete-profile';
  url.searchParams.set('mode', 'phone_required');
  const returnCandidate = sanitizeReturnUrl(`${pathname}${search}`);
  if (returnCandidate) {
    url.searchParams.set('returnUrl', returnCandidate);
  }
  return NextResponse.redirect(url, 307);
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const routing = getRouting();

  const excluded = passthroughIfExcludedPath(pathname);
  if (excluded) return excluded;

  const phoneRedirect = await enforcePhoneVerifiedCookie(request, pathname, search, routing);
  if (phoneRedirect) return phoneRedirect;

  const legacyDefaultLocale = redirectLegacyDefaultLocalePath(request, pathname, search, routing);
  if (legacyDefaultLocale) return legacyDefaultLocale;

  const enable = isLanguageSwitcherEnabled();
  if (!enable) {
    return handleLanguageSwitcherDisabled(request, pathname, search, routing);
  }

  const caseFix = redirectPrefixedWrongCase(request, pathname, search, routing);
  if (caseFix) return caseFix;

  if (getLocaleFromPathname(pathname, routing)) {
    return NextResponse.next(withUrlPathnameRequest(request));
  }

  const pref = redirectPreferredPrefixedLocale(request, pathname, search, routing);
  if (pref) return pref;

  return rewriteUnprefixedToDefaultLocale(request, pathname, search, routing);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ],
};
