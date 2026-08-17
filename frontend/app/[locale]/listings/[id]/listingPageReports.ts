import type { Listing } from '@/lib/api';
import type { Locale } from '@/lib/i18n-types';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry, isVinMasked } from '@/lib/utils';

const DEFAULT_PARTNER_QUERY_PARAM = 'from';

function getReportProviderConfig() {
  const siteConfig = loadSiteConfigSync(getCountry());
  return siteConfig.reportProvider;
}

function appendQueryParam(url: string, key: string, value: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function pickLocalizedUrl(urls: Record<string, string>, locale: Locale): string | null {
  const language = locale.split('-')[0];
  const candidates = [locale, language, 'en', 'ro'];
  for (const key of candidates) {
    const value = urls[key]?.trim();
    if (value) {
      return value;
    }
  }
  return null;
}

function hasNonEmptyUrl(urls: Record<string, string> | undefined): boolean {
  if (!urls) {
    return false;
  }
  return Object.values(urls).some((value) => Boolean(value?.trim()));
}

export function getReportBaseUrl(locale: Locale): string | null {
  const reportProvider = getReportProviderConfig();
  if (!reportProvider) {
    return null;
  }

  const baseUrl = pickLocalizedUrl(reportProvider.baseUrls, locale);
  if (!baseUrl) {
    return null;
  }

  const partnerFrom = reportProvider.partnerFrom?.trim();
  if (!partnerFrom) {
    return baseUrl;
  }

  const partnerQueryParam = reportProvider.partnerQueryParam?.trim() || DEFAULT_PARTNER_QUERY_PARAM;
  if (baseUrl.includes(`${partnerQueryParam}=`)) {
    return baseUrl;
  }

  return appendQueryParam(baseUrl, partnerQueryParam, partnerFrom);
}

export function getReportDemoUrl(locale: Locale): string | null {
  const reportProvider = getReportProviderConfig();
  if (!reportProvider) {
    return null;
  }

  return pickLocalizedUrl(reportProvider.demoUrls, locale);
}

function isReportProviderConfigured(): boolean {
  const reportProvider = getReportProviderConfig();
  if (!reportProvider) {
    return false;
  }

  return hasNonEmptyUrl(reportProvider.baseUrls) && hasNonEmptyUrl(reportProvider.demoUrls);
}

export function getReportUrl(listing: Listing, locale: Locale = 'ro'): string | null {
  const baseUrl = getReportBaseUrl(locale);
  if (!baseUrl) {
    return null;
  }

  const vin = listing.vin?.trim();
  if (vin && !isVinMasked(vin)) {
    return appendQueryParam(baseUrl, 'vin', vin);
  }

  return baseUrl;
}

export function shouldShowReportSection(listing: Listing): boolean {
  if (!isReportProviderConfigured()) {
    return false;
  }

  return listing.status === 'Active';
}
