import type { Locale } from './i18n-types';
import { localePrefixPath, localizeAbsoluteUrl, stripLocalePrefixFromPathname } from './url-locale';

export function buildPostAuthRedirect(target: string, locale: Locale): string {
  if (target.startsWith('http://') || target.startsWith('https://')) {
    return localizeAbsoluteUrl(target, locale) ?? target;
  }
  const withSlash = target.startsWith('/') ? target : `/${target}`;
  const qIdx = withSlash.indexOf('?');
  const pathOnly = qIdx >= 0 ? withSlash.slice(0, qIdx) : withSlash;
  const query = qIdx >= 0 ? withSlash.slice(qIdx) : '';
  const { restPath } = stripLocalePrefixFromPathname(pathOnly);
  return localePrefixPath(`${restPath}${query}`, locale);
}
