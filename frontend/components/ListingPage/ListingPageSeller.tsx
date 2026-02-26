'use client';

import { CopyButton } from '@/components/common/CopyButton';
import { useI18n } from '@/components/providers/I18nProvider';
import { useCities } from '@/hooks/useCities';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { Listing } from '@/lib/api';
import { getCityName, getTelegramUrl, getViberUrl, getWhatsAppUrl } from '@/lib/utils';

const MESSENGER_ICON_PATH =
  'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14';
const BOARD_ICON_PATH =
  'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';

function SellerMessengerLinks({
  listing,
  listingId,
  t,
}: {
  listing: Listing;
  listingId: string;
  t: (k: string) => string;
}) {
  const user = listing.user!;
  const hasAny = user.viber || user.whatsapp || user.telegram;
  if (listing.status === 'Closed' || !hasAny || !user.phone) return null;

  const track = (channel: 'viber' | 'whatsapp' | 'telegram') => {
    analytics.contactSeller(listingId, channel, {
      title: listing.title,
      price: listing.price,
    });
  };

  return (
    <div>
      <span className="font-semibold text-primary-700 mb-2 block">
        {t('listingDetail.availableMessengers')}:
      </span>
      <div className="flex flex-wrap gap-2">
        {user.viber && (
          <a
            href={getViberUrl(user.phone) || '#'}
            onClick={() => track('viber')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-500/20 text-purple-700 border border-purple-500/30 hover-only:hover:bg-purple-500/30 hover-only:hover:border-purple-500/50 transition-colors cursor-pointer"
          >
            {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
            <span>Viber</span>
            <svg
              className="w-3.5 h-3.5 opacity-70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={MESSENGER_ICON_PATH}
              />
            </svg>
          </a>
        )}
        {user.whatsapp && (
          <a
            href={getWhatsAppUrl(user.phone) || '#'}
            onClick={() => track('whatsapp')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-500/20 text-primary-700 border border-primary-500/30 hover-only:hover:bg-primary-500/30 hover-only:hover:border-primary-500/50 transition-colors cursor-pointer"
          >
            {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
            <span>WhatsApp</span>
            <svg
              className="w-3.5 h-3.5 opacity-70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={MESSENGER_ICON_PATH}
              />
            </svg>
          </a>
        )}
        {user.telegram && (
          <a
            href={getTelegramUrl(user.phone) || '#'}
            onClick={() => track('telegram')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-700 border border-blue-500/30 hover-only:hover:bg-blue-500/30 hover-only:hover:border-blue-500/50 transition-colors cursor-pointer"
          >
            {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
            <span>Telegram</span>
            <svg
              className="w-3.5 h-3.5 opacity-70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={MESSENGER_ICON_PATH}
              />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

function SellerBoardLink({
  listing,
  activeListingsCount,
  boardSlug,
  t,
}: {
  listing: Listing;
  activeListingsCount: number;
  boardSlug: string | null;
  t: (k: string) => string;
}) {
  if (!listing.user || activeListingsCount <= 1 || !boardSlug) return null;
  const icon = (
    <svg
      className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={BOARD_ICON_PATH} />
    </svg>
  );
  const label = t('listingDetail.allListingsFromSeller');
  if (listing.status === 'Closed') {
    return (
      <span
        className="w-full min-h-12 px-4 md:px-8 py-2 md:py-2.5 text-sm md:text-base rounded-lg font-medium flex items-center justify-center gap-2 bg-bg-darker text-text-secondary border-2 border-divider cursor-not-allowed opacity-50"
        title={t('listingDetail.unavailableForClosed')}
      >
        {icon}
        <span className="whitespace-nowrap">{label}</span>
      </span>
    );
  }
  return (
    <a
      href={`/board/${boardSlug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full min-h-12 px-4 md:px-8 py-2 md:py-2.5 text-sm md:text-base rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 border-2 border-primary-700 !bg-primary-500/10 select-none"
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </a>
  );
}

interface ListingPageSellerProps {
  listing: Listing;
  listingId: string;
  activeListingsCount: number;
  boardSlug: string | null;
}

export function ListingPageSeller({
  listing,
  listingId: id,
  activeListingsCount,
  boardSlug,
}: ListingPageSellerProps) {
  const { t } = useTranslation();
  const { locale } = useI18n();
  const { cities } = useCities();

  if (!listing.user) return null;

  const user = listing.user;
  const isBusiness = user.type === 'Business';
  const isClosed = listing.status === 'Closed';
  const secondaryStyle = { color: 'rgb(var(--text-secondary-rgb))' as const };

  return (
    <div className="surface overflow-hidden">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-900">
        {t('listingDetail.contactInfo')}
      </h2>
      <div className="space-y-4 break-words">
        <div>
          <span className="font-semibold text-primary-700">{t('listingDetail.sellerType')}:</span>
          <span className="ml-2" style={secondaryStyle}>
            {isBusiness ? t('listingDetail.business') : t('listingDetail.individual')}
          </span>
        </div>

        {user.firstName && (
          <div>
            <span className="font-semibold text-primary-700">{t('listingDetail.name')}:</span>
            <span className="ml-2" style={secondaryStyle}>
              {user.firstName}
            </span>
          </div>
        )}

        {!isClosed && isBusiness && user.companyName && (
          <div>
            <span className="font-semibold text-primary-700">{t('listingDetail.company')}:</span>
            <span className="ml-2" style={secondaryStyle}>
              {user.companyName}
            </span>
          </div>
        )}

        {!isClosed && isBusiness && user.companyWebsiteUrl && (
          <div className="flex items-center min-w-0 gap-2">
            <span className="font-semibold text-primary-700 flex-shrink-0">
              {t('listingDetail.companyWebsite')}:
            </span>
            <a
              href={user.companyWebsiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 truncate hover-only:hover:text-primary-300 transition-colors underline"
              style={secondaryStyle}
              title={user.companyWebsiteUrl}
            >
              {user.companyWebsiteUrl}
            </a>
          </div>
        )}

        <div>
          <span className="font-semibold text-primary-700">{t('listingDetail.city')}:</span>
          <span className="ml-2" style={secondaryStyle}>
            {getCityName(listing.city, locale, cities)}
          </span>
        </div>

        {isClosed ? (
          <>
            <div>
              <span className="font-semibold text-primary-700">{t('listingDetail.email')}:</span>
              <span className="ml-2 text-text-secondary">••••••••</span>
            </div>
            <div>
              <span className="font-semibold text-primary-700">{t('listingDetail.phone')}:</span>
              <span className="ml-2 text-text-secondary">••••••••</span>
            </div>
          </>
        ) : (
          <>
            {user.email && (
              <div className="flex items-center min-w-0">
                <span className="font-semibold text-primary-700 flex-shrink-0">
                  {t('listingDetail.email')}:
                </span>
                <a
                  href={`mailto:${user.email}`}
                  className="ml-2 hover-only:hover:text-primary-300 transition-colors underline break-all min-w-0"
                  style={secondaryStyle}
                >
                  {user.email}
                </a>
                <CopyButton
                  text={user.email}
                  label={t('listingDetail.email')}
                  successMessageKey="listingDetail.copied"
                  errorMessageKey="listingDetail.copyError"
                  title={t('listingDetail.copyEmail')}
                  className="ml-2"
                  iconClassName="w-4 h-4"
                />
              </div>
            )}
            {user.phone && (
              <div className="flex items-center min-w-0">
                <span className="font-semibold text-primary-700 flex-shrink-0">
                  {t('listingDetail.phone')}:
                </span>
                <a
                  href={`tel:${user.phone}`}
                  onClick={() =>
                    analytics.contactSeller(id, 'phone', {
                      title: listing.title,
                      price: listing.price,
                    })
                  }
                  className="ml-2 hover-only:hover:text-primary-300 transition-colors underline break-all min-w-0"
                  style={secondaryStyle}
                >
                  {user.phone}
                </a>
                <CopyButton
                  text={user.phone}
                  label={t('listingDetail.phone')}
                  successMessageKey="listingDetail.copied"
                  errorMessageKey="listingDetail.copyError"
                  title={t('listingDetail.copyPhone')}
                  className="ml-2"
                  iconClassName="w-4 h-4"
                />
              </div>
            )}
          </>
        )}

        <SellerMessengerLinks listing={listing} listingId={id} t={t} />

        {listing.user && activeListingsCount > 1 && boardSlug && (
          <div className="pt-4 border-t border-primary-500/20">
            <SellerBoardLink
              listing={listing}
              activeListingsCount={activeListingsCount}
              boardSlug={boardSlug}
              t={t}
            />
          </div>
        )}
      </div>
    </div>
  );
}
