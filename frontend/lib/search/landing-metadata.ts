import type { Listing } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

export function fillTemplate(template: unknown, vars: Record<string, string>): string {
  const safeTemplate = typeof template === 'string' ? template : '';
  return safeTemplate.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export function getListingPriceLabel(listing: Listing | undefined): string | null {
  if (!listing) {
    return null;
  }

  const price = listing.approxPriceDefaultCurrency ?? listing.price;
  if (
    price === undefined ||
    price === null ||
    !Number.isFinite(Number(price)) ||
    Number(price) <= 0
  ) {
    return null;
  }

  const currency = listing.defaultCurrencyCode ?? listing.currency;
  if (!currency) {
    return null;
  }

  return `${formatPrice(Number(price), currency)} ${currency}`;
}

export function buildLandingTitle(
  templates: { title: unknown; titleWithPrice: unknown },
  vars: Record<string, string>,
): string {
  const template = vars.price ? templates.titleWithPrice : templates.title;
  return fillTemplate(template, vars);
}
