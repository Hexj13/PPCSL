import type { Listing } from '@/lib/api';
import type { Locale } from '@/lib/i18n-types';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry, isVinMasked } from '@/lib/utils';

type ReportLocale = 'ro' | 'ru';

function normalizeReportLocale(locale: Locale): ReportLocale {
  return locale === 'ru' ? 'ru' : 'ro';
}

function getReportProviderConfig() {
  const siteConfig = loadSiteConfigSync(getCountry());
  return siteConfig.reportProvider;
}

function appendQueryParam(url: string, key: string, value: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

export function getReportBaseUrl(locale: Locale): string | null {
  const reportProvider = getReportProviderConfig();
  if (!reportProvider) {
    return null;
  }

  const partnerFrom = reportProvider.partnerFrom.trim();
  if (!partnerFrom) {
    return null;
  }

  const normalizedLocale = normalizeReportLocale(locale);
  const baseUrl = reportProvider.baseUrls[normalizedLocale] ?? reportProvider.baseUrls.ro ?? null;
  if (!baseUrl) {
    return null;
  }

  if (baseUrl.includes('from=')) {
    return baseUrl;
  }

  return appendQueryParam(baseUrl, 'from', partnerFrom);
}

export function getReportDemoUrl(locale: Locale): string | null {
  const reportProvider = getReportProviderConfig();
  if (!reportProvider) {
    return null;
  }

  const normalizedLocale = normalizeReportLocale(locale);
  return reportProvider.demoUrls[normalizedLocale] ?? reportProvider.demoUrls.ro ?? null;
}

function isReportProviderConfigured(): boolean {
  const reportProvider = getReportProviderConfig();
  if (!reportProvider) {
    return false;
  }

  if (!reportProvider.partnerFrom.trim()) {
    return false;
  }

  if (!reportProvider.baseUrls.ro?.trim()) {
    return false;
  }

  if (!reportProvider.demoUrls.ro?.trim()) {
    return false;
  }

  return true;
}

export function getReportUrl(listing: Listing, locale: Locale = 'ro'): string | null {
  const baseUrl = getReportBaseUrl(locale);
  if (!baseUrl) {
    return null;
  }

  const vin = listing.vin?.trim();
  if (vin && !isVinMasked(vin)) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}vin=${encodeURIComponent(vin)}`;
  }

  return baseUrl;
}

export function shouldShowReportSection(listing: Listing): boolean {
  if (!isReportProviderConfigured()) {
    return false;
  }

  return listing.status === 'Active';
}
