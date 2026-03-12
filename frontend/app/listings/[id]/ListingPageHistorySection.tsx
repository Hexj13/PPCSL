'use client';

import { useI18n } from '@/components/providers/I18nProvider';
import { analytics } from '@/lib/analytics';
import type { Listing } from '@/lib/api';
import { InfoBlock, HintTooltip, CoinsIcon, EyeIcon, LoadingSpinner } from '@/ui';

import { getInfocarDemoUrl, shouldShowInfocarSection } from './listingPageInfocar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const LINK_BUTTON_CLASS =
  'w-full min-h-12 px-4 md:px-8 py-2 md:py-2.5 text-sm md:text-base rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 border-2 border-primary-700 bg-primary-500/10! select-none';

export interface ListingPageHistorySectionProps {
  listing: Listing;
  loadingPrevious: boolean;
  previousListings: Listing[];
  router: { push: (url: string) => void };
  t: (k: string) => string;
  formatDate: (d: string | Date) => string;
  formatMileage: (n: number) => string;
}

export function ListingPageHistorySection({
  listing,
  loadingPrevious,
  previousListings,
  router,
  t,
  formatDate,
  formatMileage,
}: ListingPageHistorySectionProps) {
  const { locale } = useI18n();
  const reportRedirectUrl = `${API_URL}/api/listings/${listing.id}/report-redirect?locale=${locale}`;

  const handleOrderReportClick = () => {
    analytics.infocarCheck(
      listing.id,
      !!listing.vin?.trim(),
      listing.vehicle?.brand?.name,
      listing.vehicle?.model?.name,
      listing.vehicle?.year,
    );
  };

  const handleSampleReportClick = () => {
    analytics.infocarSampleClick(listing.id);
  };

  return (
    <div className="surface overflow-visible">
      <div className="flex items-center gap-2 mb-4 min-w-0">
        <h2 className="text-xl md:text-2xl font-bold text-primary-900 min-w-0 wrap-break-word">
          {t('listingDetail.historyAndReport')}
        </h2>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-base md:text-lg font-semibold text-primary-900">
          {t('listingDetail.vehicleHistory')}
        </h3>
        {listing.vin && (
          <HintTooltip ariaLabel={t('listingDetail.historyHint')}>
            {t('listingDetail.historyHint')}
          </HintTooltip>
        )}
      </div>
      {!listing.vin ? (
        <InfoBlock>
          <div>
            <p className="font-semibold text-primary-700 text-sm mb-1">
              {t('listingDetail.vinNotProvided')}
            </p>
            <p>{t('listingDetail.vinNotProvidedDescription')}</p>
          </div>
        </InfoBlock>
      ) : loadingPrevious ? (
        <div className="text-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      ) : previousListings.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary-500/20">
                <th className="text-left py-2 px-2 sm:px-3 font-semibold text-xs sm:text-sm text-primary-900">
                  {t('listingDetail.title')}
                </th>
                <th className="text-left py-2 px-2 sm:px-3 font-semibold text-xs sm:text-sm hidden sm:table-cell text-primary-900">
                  {t('listingDetail.mileage')}
                </th>
                <th className="text-left py-2 px-2 sm:px-3 font-semibold text-xs sm:text-sm hidden md:table-cell text-primary-900">
                  {t('listingDetail.closedAt')}
                </th>
                <th className="text-left sm:text-right py-2 px-2 sm:px-3 font-semibold text-xs sm:text-sm text-primary-900"></th>
              </tr>
            </thead>
            <tbody>
              {previousListings.map((prevListing) => (
                <tr
                  key={prevListing.id}
                  className="border-b border-primary-500/10 hover-only:hover:bg-bg-darker/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/listings/${prevListing.id}`)}
                >
                  <td
                    className="py-3 px-2 sm:px-3 text-xs sm:text-sm"
                    style={{ color: 'rgb(var(--text-primary-rgb))' }}
                  >
                    {prevListing.title}
                  </td>
                  <td className="py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm hidden sm:table-cell text-primary-700">
                    {prevListing.vehicle?.mileage_km
                      ? `${formatMileage(prevListing.vehicle.mileage_km)} ${t('listings.km')}`
                      : '-'}
                  </td>
                  <td className="py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm hidden md:table-cell text-primary-700">
                    {formatDate(prevListing.updated_at)}
                  </td>
                  <td className="py-3 px-2 sm:px-3 text-left sm:text-right">
                    <span className="text-primary-700 hover-only:hover:text-primary-900 transition-colors text-xs font-medium">
                      {t('listingDetail.open')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <InfoBlock>{t('listingDetail.noPreviousListings')}</InfoBlock>
      )}

      {shouldShowInfocarSection(listing) && (
        <>
          <div className="flex items-center gap-2 mt-6 mb-3">
            <h3 className="text-base md:text-lg font-semibold text-primary-900">
              {t('listingDetail.externalReports')}
            </h3>
            <HintTooltip ariaLabel={t('listingDetail.externalReportsHint')}>
              {t('listingDetail.externalReportsHint')}
            </HintTooltip>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={reportRedirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOrderReportClick}
              className={LINK_BUTTON_CLASS}
              aria-label={t('listingDetail.orderReport')}
            >
              <CoinsIcon className="w-5 h-5 shrink-0" />
              {t('listingDetail.orderReport')}
            </a>
            <a
              href={getInfocarDemoUrl(locale)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleSampleReportClick}
              className={LINK_BUTTON_CLASS}
              aria-label={t('listingDetail.sampleReport')}
            >
              <EyeIcon className="w-5 h-5 shrink-0" />
              {t('listingDetail.sampleReport')}
            </a>
          </div>
        </>
      )}
    </div>
  );
}
