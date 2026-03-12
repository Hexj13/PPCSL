import type { Listing } from '@/lib/api';
import type { Locale } from '@/lib/i18n-types';
import { isVinMasked } from '@/lib/utils';

export const INFOCAR_BASE_URL_RO = 'https://infocar.md/?from=kupito';
export const INFOCAR_BASE_URL_RU = 'https://ru.infocar.md/?from=kupito';

export function getInfocarBaseUrl(locale: Locale): string {
  return locale === 'ru' ? INFOCAR_BASE_URL_RU : INFOCAR_BASE_URL_RO;
}

export function getInfocarDemoUrl(locale: Locale): string {
  const host = locale === 'ru' ? 'https://ru.infocar.md' : 'https://infocar.md';
  return `${host}/demo?from=kupito`;
}

export function getInfocarUrl(listing: Listing, locale: Locale = 'ro'): string {
  const base = getInfocarBaseUrl(locale);
  const vin = listing.vin?.trim();
  if (vin && !isVinMasked(vin)) {
    return `${base}&vin=${encodeURIComponent(vin)}`;
  }
  return base;
}

export function shouldShowInfocarSection(listing: Listing): boolean {
  return listing.status === 'Active';
}
