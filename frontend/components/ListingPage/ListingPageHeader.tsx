'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { Listing } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

interface ListingPageHeaderProps {
  listing: Listing;
  title: string;
}

export function ListingPageHeader({ listing, title }: ListingPageHeaderProps) {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-6 text-primary-700 hover:text-primary-500 transition-colors">
        {title}
      </h1>
      <div className="mb-6">
        <div
          className={`flex items-baseline gap-3 flex-wrap ${
            listing.status === 'Closed' || listing.is_promoted || listing.is_new || listing.urgent
              ? 'mb-6'
              : ''
          }`}
        >
          {listing.status === 'Closed' || listing.price === undefined ? (
            <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary-500">
              ••••
            </span>
          ) : (
            <>
              <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary-700">
                {formatPrice(listing.price, listing.currency)}
              </span>
              <span
                className="text-lg md:text-xl font-medium"
                style={{ color: 'rgb(var(--text-secondary-rgb))' }}
              >
                {listing.currency}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {listing.status === 'Closed' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-500/20 border border-red-500/40 text-text-secondary shadow-sm">
              <span>🔒</span>
              <span>{t('listingDetail.closed')}</span>
            </span>
          )}
          {listing.is_promoted && (
            <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 border-accent text-text-secondary shadow-lg whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-lg before:bg-accent/10 before:pointer-events-none">
              <svg
                className="w-4 h-4 flex-shrink-0"
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
            <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 border-primary-500 text-text-secondary shadow-lg whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-lg before:bg-primary-500/10 before:pointer-events-none">
              {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
              <span
                className="relative z-10 text-text-secondary"
                style={{ filter: 'grayscale(1) brightness(0.5)' }}
              >
                ✨
              </span>
              <span className="relative z-10">{t('listingDetail.new')}</span>
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
    </div>
  );
}
