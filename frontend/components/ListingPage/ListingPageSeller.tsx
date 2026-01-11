'use client';

import { CopyButton } from '@/components/CopyButton';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { Listing } from '@/lib/api';
import { getCityNameMk, getTelegramUrl, getViberUrl, getWhatsAppUrl } from '@/lib/utils';

interface ListingPageSellerProps {
  listing: Listing;
  listingId: string;
  activeListingsCount: number;
  onOpenUserListings: () => void;
}

export function ListingPageSeller({
  listing,
  listingId: id,
  activeListingsCount,
  onOpenUserListings,
}: ListingPageSellerProps) {
  const { t } = useTranslation();

  if (!listing.user) {
    return null;
  }

  return (
    <div className="surface overflow-hidden">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-400">
        {t('listingDetail.contactInfo')}
      </h2>
      <div className="space-y-4 break-words">
        <div>
          <span className="font-semibold text-primary-400">{t('listingDetail.sellerType')}:</span>
          <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
            {listing.user.type === 'Business'
              ? t('listingDetail.business')
              : t('listingDetail.individual')}
          </span>
        </div>

        {listing.user.firstName && (
          <div>
            <span className="font-semibold text-primary-400">{t('listingDetail.name')}:</span>
            <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
              {listing.user.firstName}
            </span>
          </div>
        )}

        {listing.status !== 'Closed' &&
          listing.user.type === 'Business' &&
          listing.user.companyName && (
            <div>
              <span className="font-semibold text-primary-400">{t('listingDetail.company')}:</span>
              <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                {listing.user.companyName}
              </span>
            </div>
          )}

        <div>
          <span className="font-semibold text-primary-400">{t('listingDetail.city')}:</span>
          <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
            {getCityNameMk(listing.city)}
          </span>
        </div>

        {listing.status === 'Closed' ? (
          <div>
            <span className="font-semibold text-primary-400">{t('listingDetail.email')}:</span>
            <span className="ml-2 text-primary-400">••••••••</span>
          </div>
        ) : (
          listing.user.email && (
            <div className="flex items-center min-w-0">
              <span className="font-semibold text-primary-400 flex-shrink-0">
                {t('listingDetail.email')}:
              </span>
              <a
                href={`mailto:${listing.user.email}`}
                className="ml-2 hover:text-primary-300 transition-colors underline break-all min-w-0"
                style={{ color: 'rgb(var(--text-secondary-rgb))' }}
              >
                {listing.user.email}
              </a>
              <CopyButton
                text={listing.user.email}
                label={t('listingDetail.email')}
                successMessageKey="listingDetail.copied"
                errorMessageKey="listingDetail.copyError"
                title={t('listingDetail.copyEmail')}
                className="ml-2"
                iconClassName="w-4 h-4"
              />
            </div>
          )
        )}

        {listing.status === 'Closed' ? (
          <div>
            <span className="font-semibold text-primary-400">{t('listingDetail.phone')}:</span>
            <span className="ml-2 text-primary-400">••••••••</span>
          </div>
        ) : (
          listing.user.phone && (
            <div className="flex items-center min-w-0">
              <span className="font-semibold text-primary-400 flex-shrink-0">
                {t('listingDetail.phone')}:
              </span>
              <a
                href={`tel:${listing.user.phone}`}
                onClick={() => {
                  analytics.contactSeller(id, 'phone', {
                    title: listing.title,
                    price: listing.price,
                  });
                }}
                className="ml-2 hover:text-primary-300 transition-colors underline break-all min-w-0"
                style={{ color: 'rgb(var(--text-secondary-rgb))' }}
              >
                {listing.user.phone}
              </a>
              <CopyButton
                text={listing.user.phone}
                label={t('listingDetail.phone')}
                successMessageKey="listingDetail.copied"
                errorMessageKey="listingDetail.copyError"
                title={t('listingDetail.copyPhone')}
                className="ml-2"
                iconClassName="w-4 h-4"
              />
            </div>
          )
        )}

        {listing.status !== 'Closed' &&
          (listing.user.viber || listing.user.whatsapp || listing.user.telegram) && (
            <div>
              <span className="font-semibold text-primary-400 mb-2 block">
                {t('listingDetail.availableMessengers')}:
              </span>
              <div className="flex flex-wrap gap-2">
                {listing.user.viber && listing.user.phone && (
                  <a
                    href={getViberUrl(listing.user.phone) || '#'}
                    onClick={() => {
                      analytics.contactSeller(id, 'viber', {
                        title: listing.title,
                        price: listing.price,
                      });
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 hover:border-purple-500/50 transition-colors cursor-pointer"
                  >
                    {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
                    <span>Viber</span>
                    <svg
                      className="w-3.5 h-3.5 opacity-70"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                )}
                {listing.user.whatsapp && listing.user.phone && (
                  <a
                    href={getWhatsAppUrl(listing.user.phone) || '#'}
                    onClick={() => {
                      analytics.contactSeller(id, 'whatsapp', {
                        title: listing.title,
                        price: listing.price,
                      });
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-500/20 text-primary-300 border border-primary-500/30 hover:bg-primary-500/30 hover:border-primary-500/50 transition-colors cursor-pointer"
                  >
                    {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
                    <span>WhatsApp</span>
                    <svg
                      className="w-3.5 h-3.5 opacity-70"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                )}
                {listing.user.telegram && listing.user.phone && (
                  <a
                    href={getTelegramUrl(listing.user.phone) || '#'}
                    onClick={() => {
                      analytics.contactSeller(id, 'telegram', {
                        title: listing.title,
                        price: listing.price,
                      });
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 hover:border-blue-500/50 transition-colors cursor-pointer"
                  >
                    {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
                    <span>Telegram</span>
                    <svg
                      className="w-3.5 h-3.5 opacity-70"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          )}

        {listing.user && activeListingsCount > 1 && (
          <div className="pt-4 border-t border-primary-500/20">
            <button
              onClick={onOpenUserListings}
              disabled={listing.status === 'Closed'}
              className={`w-full flex items-center gap-2 ${
                listing.status === 'Closed' ? 'btn-outline-gray' : 'btn-outline-green'
              }`}
              title={listing.status === 'Closed' ? t('listingDetail.unavailableForClosed') : ''}
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>{t('listingDetail.allListingsFromSeller')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
