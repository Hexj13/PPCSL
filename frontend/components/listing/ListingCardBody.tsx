'use client';

import type { useListingGridCities } from '@/components/listing/CitiesProvider';
import {
  ListingCardCompactSpecs,
  ListingCardTireSpecs,
  ListingCardVehicleSpecs,
} from '@/components/listing/ListingCardParts';
import { ListingClosedStatusBadge } from '@/components/listing/ListingClosedStatusBadge';
import { PriceDisplay } from '@/components/listing/PriceDisplay';
import { TireListingPriceSuffix } from '@/components/listing/TireListingPriceSuffix';
import type { Listing } from '@/lib/api';
import { shouldShowListingViews } from '@/lib/listing-views-visibility';
import { useAuthStore } from '@/lib/store';
import {
  formatDateShort,
  formatDateRelative,
  formatViewsCompact,
  getCityName,
  isTireListing,
} from '@/lib/utils';

export function ListingCardBody({
  listing,
  displayTitle,
  locale,
  cities,
  isHydrated,
  t,
  variant = 'default',
}: {
  listing: Listing;
  displayTitle: string;
  locale: string;
  cities: ReturnType<typeof useListingGridCities>['cities'];
  isHydrated: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  variant?: 'default' | 'compact';
}) {
  const { user, isInitialized } = useAuthStore();
  const isCompact = variant === 'compact';
  const showViews =
    !isCompact &&
    shouldShowListingViews(user, isInitialized) &&
    listing.views !== undefined &&
    listing.views > 0;
  const tireCard = isTireListing(listing);
  return (
    <div className={`${isCompact ? 'p-3' : 'p-4 md:p-5'} grow flex flex-col`}>
      <h3
        className={`${isCompact ? 'font-semibold text-sm mb-1.5' : 'font-bold text-base md:text-lg mb-3'} line-clamp-2 text-primary-900`}
      >
        {displayTitle}
      </h3>
      <div
        className={`flex items-baseline justify-between gap-2 ${isCompact ? 'mb-1.5' : 'mb-3'} flex-wrap`}
      >
        <div className="flex items-baseline gap-2 flex-wrap min-w-0">
          {listing.price !== undefined ? (
            <>
              <PriceDisplay
                price={listing.price}
                currency={listing.currency ?? listing.defaultCurrencyCode ?? 'EUR'}
                approxPrice={isCompact ? undefined : listing.approxPriceDefaultCurrency}
                defaultCurrencyCode={listing.defaultCurrencyCode}
                size={isCompact ? 'xs' : 'small'}
                priceClassName="text-primary-500"
                currencyStyle={{ color: 'rgb(var(--text-secondary-rgb))' }}
              />
              <TireListingPriceSuffix
                listing={listing}
                t={t}
                className={`${isCompact ? 'text-[11px]' : 'text-xs md:text-sm'} font-medium shrink-0`}
              />
            </>
          ) : (
            <span
              className={`${isCompact ? 'text-base' : 'text-xl md:text-2xl'} font-extrabold text-primary-400`}
            >
              ••••
            </span>
          )}
        </div>
        {listing.status === 'Closed' && (
          <ListingClosedStatusBadge label={t('listingDetail.closed')} className="shrink-0" />
        )}
      </div>
      <div className={`grow ${isCompact ? 'mb-1.5' : 'mb-3'}`}>
        {isCompact ? (
          <ListingCardCompactSpecs listing={listing} t={t} />
        ) : tireCard ? (
          <ListingCardTireSpecs listing={listing} t={t} />
        ) : (
          listing.vehicle && <ListingCardVehicleSpecs vehicle={listing.vehicle} t={t} />
        )}
      </div>
      <div
        className={`flex justify-between items-center gap-2 ${isCompact ? 'text-[10px]' : 'text-sm'} font-medium mt-auto ${isCompact ? 'pt-2' : 'pt-3'} border-t border-primary-500/20`}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        <span className="min-w-0 truncate">{getCityName(listing.city, locale, cities)}</span>
        <div className="flex items-center gap-3 shrink-0">
          {showViews && (
            <>
              <span className="flex items-center gap-1 text-sm shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                {formatViewsCompact(listing.views!)}
              </span>
              <span className="h-4 w-px bg-primary-500/20 shrink-0" />
            </>
          )}
          <span suppressHydrationWarning>
            {isHydrated
              ? formatDateRelative(listing.last_updated_at, t, locale)
              : formatDateShort(listing.last_updated_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
