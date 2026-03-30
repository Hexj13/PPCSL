'use client';

import { ListingClosedStatusBadge } from '@/components/listing/ListingClosedStatusBadge';
import { PriceDisplay } from '@/components/listing/PriceDisplay';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing } from '@/lib/api';
import { formatPrice, getVehicleType, isTireListing } from '@/lib/utils';
import { BenefitCheckRow } from '@/ui';

const SPARKLES_EMOJI = '\u2728';

interface ListingPageHeaderProps {
  listing: Listing;
  title: string;
}

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

function ListingPrice({ listing }: { listing: Listing }) {
  if (listing.status === 'Closed' || listing.price === undefined) {
    return (
      <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary-500">••••</span>
    );
  }

  return (
    <PriceDisplay
      price={listing.price}
      currency={listing.currency ?? listing.defaultCurrencyCode ?? 'EUR'}
      approxPrice={listing.approxPriceDefaultCurrency}
      defaultCurrencyCode={listing.defaultCurrencyCode}
      size="large"
      priceClassName="text-primary-500"
      currencyStyle={{ color: 'rgb(var(--text-secondary-rgb))' }}
    />
  );
}

function ListingBenefits({ listing, t }: { listing: Listing; t: TranslateFn }) {
  const showBenefits =
    listing.negotiable ||
    listing.available_in_credit ||
    (listing.available_in_credit &&
      listing.down_payment_amount != null &&
      listing.down_payment_amount > 0);

  if (!showBenefits) return null;

  return (
    <div className="flex flex-col gap-1.5 text-primary-900 text-[14px] leading-relaxed">
      {listing.negotiable && <BenefitCheckRow>{t('listingDetail.negotiable')}</BenefitCheckRow>}
      {listing.available_in_credit && (
        <BenefitCheckRow>{t('listingDetail.availableInCredit')}</BenefitCheckRow>
      )}
      {listing.available_in_credit &&
        listing.down_payment_amount != null &&
        listing.down_payment_amount > 0 && (
          <BenefitCheckRow>
            {t('listingDetail.downPaymentFromLabel', {
              amount: formatPrice(listing.down_payment_amount),
              currency: listing.currency ?? listing.defaultCurrencyCode ?? 'EUR',
            })}
          </BenefitCheckRow>
        )}
    </div>
  );
}

function ListingStatusBadges({
  listing,
  t,
  newLabel,
  showNewVehicleBadge,
}: {
  listing: Listing;
  t: TranslateFn;
  newLabel: string;
  showNewVehicleBadge: boolean;
}) {
  const hasStatusBadges =
    listing.status === 'Closed' || listing.is_promoted || showNewVehicleBadge || listing.urgent;

  if (!hasStatusBadges) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {listing.status === 'Closed' && (
        <ListingClosedStatusBadge label={t('listingDetail.closed')} />
      )}
      {listing.is_promoted && (
        <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 border-accent text-text-secondary shadow-lg whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-lg before:bg-accent/10 before:pointer-events-none">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          <span className="relative z-10">{t('listingDetail.promoted')}</span>
        </span>
      )}
      {showNewVehicleBadge && (
        <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 border-newBadge text-text-secondary shadow-lg whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-lg before:bg-newBadge/10 before:pointer-events-none">
          <span
            className="relative z-10 text-text-secondary"
            style={{ filter: 'grayscale(1) brightness(0.5)' }}
            aria-label={newLabel}
          >
            {SPARKLES_EMOJI}
          </span>
          <span className="relative z-10">{newLabel}</span>
        </span>
      )}
      {listing.urgent && (
        <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 border-accentSecondary text-text-secondary shadow-lg whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-lg before:bg-accentSecondary/10 before:pointer-events-none">
          <span
            className="relative z-10 text-text-secondary"
            style={{ filter: 'grayscale(1) brightness(0.5)' }}
          >
            🔥
          </span>
          <span className="relative z-10">{t('listingDetail.urgent')}</span>
        </span>
      )}
    </div>
  );
}

export function ListingPageHeader({ listing, title }: ListingPageHeaderProps) {
  const { t } = useTranslation();
  const vehicleType = getVehicleType(listing);
  const showNewVehicleBadge = Boolean(listing.is_new && !isTireListing(listing));
  const newLabel = vehicleType === 'moto' ? t('listingDetail.newMoto') : t('listingDetail.new');
  const tirePriceScopeLine =
    isTireListing(listing) &&
    listing.tire != null &&
    listing.status !== 'Closed' &&
    listing.price !== undefined;
  const showMeta =
    tirePriceScopeLine ||
    listing.negotiable ||
    (!isTireListing(listing) && listing.available_in_credit) ||
    listing.status === 'Closed' ||
    listing.is_promoted ||
    showNewVehicleBadge ||
    listing.urgent;

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-4 md:mb-6 text-primary-900">
        {title}
      </h1>
      <div className="mb-6">
        <div className="flex items-baseline gap-3 flex-wrap">
          <ListingPrice listing={listing} />
        </div>
        {showMeta && (
          <div className="mt-4 space-y-4">
            {tirePriceScopeLine && (
              <div className="text-primary-900 text-[14px] leading-relaxed">
                <BenefitCheckRow>
                  {listing.tire!.quantity === 1
                    ? t('listingDetail.tirePriceScopePerUnit')
                    : t('listingDetail.tirePriceScopePerSet')}
                </BenefitCheckRow>
              </div>
            )}
            <ListingBenefits listing={listing} t={t} />
            <ListingStatusBadges
              listing={listing}
              t={t}
              newLabel={newLabel}
              showNewVehicleBadge={showNewVehicleBadge}
            />
          </div>
        )}
      </div>
    </div>
  );
}
