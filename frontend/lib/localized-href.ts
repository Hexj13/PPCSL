import type { Locale } from './i18n-types';
import { localePrefixPath } from './url-locale';

export function localizedHref(restPathWithOptionalQuery: string, locale: Locale): string {
  return localePrefixPath(restPathWithOptionalQuery, locale);
}
