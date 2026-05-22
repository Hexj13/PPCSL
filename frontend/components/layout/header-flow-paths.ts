import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

export const HIDE_FOOTER_PATHS = [
  '/sign',
  '/reset-password',
  '/verify-phone',
  '/profile/change-phone',
  '/profile/verify-phone-change',
] as const;

export const PROFILE_PHONE_FLOW_PATHS = [
  '/profile/change-phone',
  '/profile/verify-phone-change',
] as const;

const AUTH_ROUTE_REST_PREFIXES = ['/sign', '/verify-phone', '/reset-password'] as const;

function restPathMatchesPrefix(restPath: string, prefix: string): boolean {
  return (
    restPath === prefix || restPath.startsWith(`${prefix}/`) || restPath.startsWith(`${prefix}?`)
  );
}

export function isSignRoutePathname(pathname: string): boolean {
  const { restPath } = stripLocalePrefixFromPathname(pathname);
  return restPathMatchesPrefix(restPath, '/sign');
}

export function isAuthRoutePathname(pathname: string): boolean {
  const { restPath } = stripLocalePrefixFromPathname(pathname);
  return AUTH_ROUTE_REST_PREFIXES.some((p) => restPathMatchesPrefix(restPath, p));
}

export function isHideFooterPath(pathname: string): boolean {
  const { restPath } = stripLocalePrefixFromPathname(pathname);
  return (HIDE_FOOTER_PATHS as readonly string[]).some((p) => {
    return restPath === p || restPath.startsWith(`${p}/`) || restPath.startsWith(`${p}?`);
  });
}

export function isProfilePhoneFlowPath(pathname: string): boolean {
  const { restPath } = stripLocalePrefixFromPathname(pathname);
  return (PROFILE_PHONE_FLOW_PATHS as readonly string[]).some((p) => {
    return restPath === p || restPath.startsWith(`${p}/`) || restPath.startsWith(`${p}?`);
  });
}

const AUTH_REQUIRED_REST_PREFIXES = [
  '/profile',
  '/favorites',
  '/my-listings',
  '/listings/new',
  '/admin',
  '/complete-profile',
] as const;

const LISTING_EDIT_REST_PATH_RE = /^\/listings\/[^/]+\/edit(?:\/|$|\?)/;

export function isAuthRequiredPathname(pathname: string): boolean {
  const { restPath } = stripLocalePrefixFromPathname(pathname);
  if (LISTING_EDIT_REST_PATH_RE.test(restPath)) {
    return true;
  }
  return AUTH_REQUIRED_REST_PREFIXES.some((prefix) => restPathMatchesPrefix(restPath, prefix));
}
