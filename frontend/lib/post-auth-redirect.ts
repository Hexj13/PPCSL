import type { Locale } from './i18n-types';
import { localePrefixPath, localizeAbsoluteUrl, stripLocalePrefixFromPathname } from './url-locale';

function isAllowedSameOriginAbsoluteUrl(target: string): boolean {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return false;
  try {
    const allowed = new URL(siteUrl);
    const candidate = new URL(target);
    return candidate.origin === allowed.origin;
  } catch {
    return false;
  }
}

export function buildPostAuthRedirect(target: string, locale: Locale): string {
  if (target.startsWith('http://') || target.startsWith('https://')) {
    if (!isAllowedSameOriginAbsoluteUrl(target)) {
      return localePrefixPath('/', locale);
    }
    return localizeAbsoluteUrl(target, locale) ?? target;
  }
  const withSlash = target.startsWith('/') ? target : `/${target}`;
  const qIdx = withSlash.indexOf('?');
  const pathOnly = qIdx >= 0 ? withSlash.slice(0, qIdx) : withSlash;
  const query = qIdx >= 0 ? withSlash.slice(qIdx) : '';
  const { restPath } = stripLocalePrefixFromPathname(pathOnly);
  return localePrefixPath(`${restPath}${query}`, locale);
}
