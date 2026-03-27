'use client';

import type { Listing } from '@/lib/api';
import { isTireListing } from '@/lib/utils';

type TTranslate = (key: string, params?: Record<string, string | number>) => string;

export function TireListingPriceSuffix({
  listing,
  t,
  className,
}: {
  listing: Listing;
  t: TTranslate;
  className: string;
}) {
  if (!isTireListing(listing) || listing.tire == null || listing.price === undefined) {
    return null;
  }
  const label =
    listing.tire.quantity === 1
      ? t('listings.tireCardPriceScopePerUnit')
      : t('listings.tireCardPriceScopePerSet');
  return (
    <span className={className} style={{ color: 'rgb(var(--gray-400-rgb))' }}>
      {label}
    </span>
  );
}
