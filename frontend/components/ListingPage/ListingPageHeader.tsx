'use client';

import { PriceDisplay } from '@/components/listing/PriceDisplay';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing } from '@/lib/api';
import { formatPrice, getVehicleType } from '@/lib/utils';

const SPARKLES_EMOJI = '\u2728';

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

interface ListingPageHeaderProps {
  listing: Listing;
  title: string;
}

export function ListingPageHeader({ listing, title }: ListingPageHeaderProps) {
  const { t } = useTranslation();
  const vehicleType = getVehicleType(listing);
  const newLabel = vehicleType === 'moto' ? t('listingDetail.newMoto') : t('listingDetail.new');

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-6 text-primary-900">
        {title}
      </h1>
      <div className="mb-6">
        <div className="flex items-baseline gap-3 flex-wrap">
          {listing.status === 'Closed' || listing.price === undefined ? (
            <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary-500">
              ••••
            </span>
          ) : (
            <PriceDisplay
              price={listing.price}
              currency={listing.currency ?? listing.defaultCurrencyCode ?? 'EUR'}
              approxPrice={listing.approxPriceDefaultCurrency}
              defaultCurrencyCode={listing.defaultCurrencyCode}
              size="large"
              priceClassName="text-primary-500"
              currencyStyle={{ color: 'rgb(var(--text-secondary-rgb))' }}
            />
          )}
        </div>
        {(listing.available_in_credit ||
          listing.status === 'Closed' ||
          listing.is_promoted ||
          listing.is_new ||
          listing.urgent) && (
          <div className="mt-4 space-y-4">
            {listing.available_in_credit && (
              <div className="flex flex-col gap-1.5 text-primary-900 text-[14px] leading-relaxed">
                <div className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 shrink-0 text-primary-500" />
                  <span className="font-medium">{t('listingDetail.availableInCredit')}</span>
                </div>
                {listing.down_payment_amount != null && listing.down_payment_amount > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 shrink-0 text-primary-500" />
                    <span className="font-medium">
                      {t('listingDetail.downPaymentFromLabel', {
                        amount: formatPrice(listing.down_payment_amount),
                        currency: listing.currency ?? listing.defaultCurrencyCode ?? 'EUR',
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {listing.status === 'Closed' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-500/20 border border-red-500/40 text-text-secondary shadow-xs">
                  <span>🔒</span>
                  <span>{t('listingDetail.closed')}</span>
                </span>
              )}
              {listing.is_promoted && (
                <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 border-accent text-text-secondary shadow-lg whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-lg before:bg-accent/10 before:pointer-events-none">
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
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
              {listing.is_new && (
                <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 border-newBadge text-text-secondary shadow-lg whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-lg before:bg-newBadge/10 before:pointer-events-none">
                  {}
                  {}
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
          </div>
        )}
      </div>
    </div>
  );
}
