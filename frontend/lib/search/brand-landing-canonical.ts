import type { Locale } from '@/lib/i18n-types';
import { localePrefixPath } from '@/lib/url-locale';

export function brandLandingVehicleTypeQs(
  sp: Record<string, string | string[] | undefined>,
): string {
  const v = typeof sp.vehicleType === 'string' ? sp.vehicleType.trim() : '';
  if (v === 'truck' || v === 'moto') {
    return `?vehicleType=${encodeURIComponent(v)}`;
  }
  return '';
}

export function needsBrandLandingPathRedirect(
  pathBrandSlug: string,
  pathModelSlug: string | undefined,
  canonicalBrandSlug: string,
  canonicalModelSlug: string | undefined,
  sp: Record<string, string | string[] | undefined>,
  hasExtraQueryKeys: boolean,
): boolean {
  if (hasExtraQueryKeys) {
    return false;
  }
  const rawVt = typeof sp.vehicleType === 'string' ? sp.vehicleType.trim() : '';
  const vtNeedsStrip = rawVt !== '' && (rawVt === 'car' || (rawVt !== 'truck' && rawVt !== 'moto'));
  if (vtNeedsStrip) {
    return true;
  }
  if (pathBrandSlug !== canonicalBrandSlug) {
    return true;
  }
  if (canonicalModelSlug !== undefined && pathModelSlug !== canonicalModelSlug) {
    return true;
  }
  return false;
}

export function brandLandingRedirectHref(
  canonicalBrandSlug: string,
  canonicalModelSlug: string | undefined,
  sp: Record<string, string | string[] | undefined>,
  locale: Locale,
): string {
  const base =
    canonicalModelSlug !== undefined
      ? `/${encodeURIComponent(canonicalBrandSlug)}/${encodeURIComponent(canonicalModelSlug)}`
      : `/${encodeURIComponent(canonicalBrandSlug)}`;
  const path = `${base}${brandLandingVehicleTypeQs(sp)}`;
  return localePrefixPath(path, locale);
}
