'use client';

import { useCallback } from 'react';

import { ListingPageActions } from '@/components/ListingPage/ListingPageActions';
import { ListingPageCharacteristics } from '@/components/ListingPage/ListingPageCharacteristics';
import { ListingPageDescription } from '@/components/ListingPage/ListingPageDescription';
import { ListingPageHeader } from '@/components/ListingPage/ListingPageHeader';
import { ListingPageImageModal } from '@/components/ListingPage/ListingPageImageModal';
import { ListingPageImages } from '@/components/ListingPage/ListingPageImages';
import { ListingPageSeller } from '@/components/ListingPage/ListingPageSeller';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import {
  BreadcrumbsSkeleton,
  MainImageSkeleton,
  ThumbnailsSkeleton,
  PriceSkeleton,
  FavoriteButtonSkeleton,
  TitleSkeleton,
  BadgesSkeleton,
} from '@/components/listing/ListingPageSkeleton';
import { SimilarListings } from '@/components/listing/SimilarListings';
import { PromotionModal } from '@/components/modals/PromotionModal';
import { useI18n } from '@/components/providers/I18nProvider';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing } from '@/lib/api';
import { formatDate, formatMileage, formatRegistrationType } from '@/lib/utils';
import { LoadingSpinner, Spinner, InfoBlock, HintTooltip } from '@/ui';

import { useListingPageClient, type UseListingPageClientReturn } from './useListingPageClient';

function getShowPromoteButton(listing: Listing, userId: string | undefined): boolean {
  return !!(
    userId &&
    listing.user &&
    userId === listing.user.id &&
    listing.status === 'Active' &&
    !listing.is_promoted
  );
}

function getBoardSlug(listing: Listing): string | null {
  if (!listing.user) return null;
  const u = listing.user as { board_slug?: string; boardSlug?: string };
  return u.board_slug ?? u.boardSlug ?? null;
}

function ListingPageListingInfoSection({
  listing,
  closingDate,
  t,
  formatDate,
  onCopyLink,
  onShare,
  canShare,
}: {
  listing: Listing;
  closingDate: Date;
  t: (k: string) => string;
  formatDate: (d: string | Date) => string;
  onCopyLink: () => void;
  onShare: () => void;
  canShare: boolean;
}) {
  return (
    <div className="surface overflow-hidden">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-900">
        {t('listingDetail.listingInfo')}
      </h2>
      <div className="space-y-3 break-words">
        {listing.views !== undefined && listing.views > 0 && (
          <div className="flex items-center gap-2 text-base min-w-0">
            <svg
              className="w-4 h-4 text-primary-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
            <span className="font-semibold text-primary-700 flex-shrink-0">
              {t('listingDetail.views')}:
            </span>
            <span
              className="min-w-0 break-words"
              style={{ color: 'rgb(var(--text-secondary-rgb))' }}
            >
              {listing.views}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-base min-w-0">
          <svg
            className="w-4 h-4 text-primary-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-semibold text-primary-700 flex-shrink-0">
            {t('listingDetail.updated')}:
          </span>
          <span className="min-w-0 break-words" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
            {formatDate(listing.last_updated_at)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-base min-w-0">
          <svg
            className="w-4 h-4 text-primary-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="font-semibold text-primary-700 flex-shrink-0">
            {t('listingDetail.willClose')}:
          </span>
          <span className="min-w-0 break-words" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
            {formatDate(closingDate)}
          </span>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-primary-500/20 space-y-2">
        <button
          onClick={onCopyLink}
          className="w-full min-h-12 px-8 py-2 md:py-2.5 text-base rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 border-2 border-primary-700 !bg-primary-500/10 select-none"
        >
          <svg
            className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <span>{t('listingDetail.copyLink')}</span>
        </button>
        {canShare && (
          <button
            onClick={onShare}
            className="w-full min-h-12 px-8 py-2 md:py-2.5 text-base rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 border-2 border-primary-700 !bg-primary-500/10 select-none"
          >
            <svg
              className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span>{t('listingDetail.share')}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function ListingPageEquipmentSection({
  equipmentColumns,
  t,
}: {
  equipmentColumns: { left: string[]; right: string[] };
  t: (k: string) => string;
}) {
  if (equipmentColumns.left.length === 0 && equipmentColumns.right.length === 0) return null;
  return (
    <div className="surface overflow-hidden">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-900">
        {t('listingDetail.equipment')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        <ul
          className="list-disc list-outside pl-5 space-y-1"
          style={{ color: 'rgb(var(--text-secondary-rgb))' }}
        >
          {equipmentColumns.left.map((key) => (
            <li key={key} className="ml-0">
              {t(`vehicleOptions.equipment.${key}`)}
            </li>
          ))}
        </ul>
        <ul
          className="list-disc list-outside pl-5 space-y-1"
          style={{ color: 'rgb(var(--text-secondary-rgb))' }}
        >
          {equipmentColumns.right.map((key) => (
            <li key={key} className="ml-0">
              {t(`vehicleOptions.equipment.${key}`)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ListingPageConditionRegistrationSection({
  listing,
  t,
  formatRegistrationType,
}: {
  listing: Listing;
  t: (k: string) => string;
  formatRegistrationType: (v: string, t: (k: string) => string) => string;
}) {
  const hasAny = listing.condition || listing.registration_type;
  if (!hasAny) return null;
  return (
    <div className="surface overflow-hidden">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-900">
        {t('listingDetail.conditionAndRegistration')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {listing.condition && (
          <div>
            <span className="text-primary-700 font-semibold">{t('listingDetail.condition')}:</span>
            <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
              {t(`vehicleOptions.condition.${listing.condition}`)}
            </span>
          </div>
        )}
        {listing.registration_type && (
          <div>
            <span className="text-primary-700 font-semibold">
              {t('listingDetail.registrationType')}:
            </span>
            <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
              {formatRegistrationType(listing.registration_type, t)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ListingPageHistorySection({
  listing,
  loadingPrevious,
  previousListings,
  router,
  t,
  formatDate,
  formatMileage,
}: {
  listing: Listing;
  loadingPrevious: boolean;
  previousListings: Listing[];
  router: { push: (url: string) => void };
  t: (k: string) => string;
  formatDate: (d: string | Date) => string;
  formatMileage: (n: number) => string;
}) {
  return (
    <div className="surface overflow-visible">
      <div className="flex items-center gap-2 mb-4 min-w-0">
        <h2 className="text-xl md:text-2xl font-bold text-primary-900 min-w-0 break-words">
          {listing.vin ? t('listingDetail.previousListings') : t('listingDetail.vehicleHistory')}
        </h2>
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
        <p style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
          {t('listingDetail.noPreviousListings')}
        </p>
      )}
    </div>
  );
}

function ListingPageSkeleton({ t }: { t: (k: string) => string }) {
  return (
    <>
      <div className="max-w-6xl mx-auto">
        <BreadcrumbsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-6 md:gap-8">
          <div className="space-y-6">
            <div>
              <MainImageSkeleton />
              <ThumbnailsSkeleton />
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <TitleSkeleton />
              <PriceSkeleton />
              <BadgesSkeleton />
              <div className="mt-8">
                <FavoriteButtonSkeleton />
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-primary-500/20 my-8"></div>
        <Spinner size="md" text={t('common.loading')} />
      </div>
    </>
  );
}

function ListingPageMainContent(props: UseListingPageClientReturn) {
  const { t } = useTranslation();
  const { locale } = useI18n();
  const formatDateWithLocale = useCallback((d: string | Date) => formatDate(d, locale), [locale]);
  const {
    router,
    listing,
    id,
    user,
    isInitialized,
    isInComparison,
    isFavorite,
    isOwnListing,
    equipmentColumns,
    displayTitle,
    imageAltTitle,
    descriptionHtml,
    getClosingDate,
    currentImageIndex,
    setCurrentImageIndex,
    isImageModalOpen,
    modalImageIndex,
    setModalImageIndex,
    imageErrors,
    setImageErrors,
    promotionModalOpen,
    setPromotionModalOpen,
    canPromote,
    canShare,
    previousListings,
    loadingPrevious,
    activeListingsCount,
    handleToggleComparison,
    handleToggleFavorite,
    handlePromoteClick,
    handleCopyLink,
    handleShare,
    handlePromotionSelect,
    openImageModal,
    closeImageModal,
  } = props;

  if (!listing) return null;

  const images =
    listing.images && listing.images.length > 0 ? listing.images : ['/placeholder-car.jpg'];
  const vehicle = listing.vehicle;
  const closingDate = getClosingDate(listing.last_updated_at);
  const brand = vehicle?.brand?.name || '';
  const model = vehicle?.model?.name || '';
  const year = vehicle?.year || '';
  const vehicleInfo = [brand, model, year].filter(Boolean).join(' ');
  const h1Title = vehicleInfo || listing.title || t('listings.defaultTitle');

  const nextImage = () => setModalImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setModalImageIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <>
      <div className="max-w-6xl mx-auto">
        <Breadcrumbs
          items={[
            { label: t('listingDetail.home'), href: '/' },
            { label: displayTitle || listing.title },
          ]}
          className="mb-6"
        />
        <div className="grid grid-cols-1 lg:grid-cols-[1.86fr_1fr] gap-6">
          <div className="space-y-6 min-w-0">
            <ListingPageImages
              images={images}
              imageAltTitle={imageAltTitle}
              currentImageIndex={currentImageIndex}
              setCurrentImageIndex={setCurrentImageIndex}
              imageErrors={imageErrors}
              onImageError={(index) => {
                setImageErrors((prev) => new Set(prev).add(index));
              }}
              onImageClick={openImageModal}
            />
          </div>

          <div className="space-y-6 min-w-0">
            <ListingPageHeader listing={listing} title={h1Title} />
            <ListingPageActions
              listing={listing}
              isInitialized={isInitialized}
              isInComparison={isInComparison}
              isFavorite={isFavorite}
              isOwnListing={isOwnListing}
              canPromote={canPromote}
              showPromoteButton={getShowPromoteButton(listing, user?.id)}
              onToggleComparison={handleToggleComparison}
              onToggleFavorite={handleToggleFavorite}
              onPromoteClick={handlePromoteClick}
            />
          </div>
        </div>

        <div className="border-t border-primary-500/20 my-8"></div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.86fr_1fr] gap-6">
          <div className="space-y-6 min-w-0">
            {vehicle && <ListingPageCharacteristics listing={listing} />}

            <ListingPageEquipmentSection equipmentColumns={equipmentColumns} t={t} />

            {listing.description && <ListingPageDescription descriptionHtml={descriptionHtml} />}

            <ListingPageConditionRegistrationSection
              listing={listing}
              t={t}
              formatRegistrationType={formatRegistrationType}
            />

            <ListingPageHistorySection
              listing={listing}
              loadingPrevious={loadingPrevious}
              previousListings={previousListings}
              router={router}
              t={t}
              formatDate={formatDateWithLocale}
              formatMileage={formatMileage}
            />
          </div>

          <div className="space-y-6 min-w-0">
            <ListingPageSeller
              listing={listing}
              listingId={id}
              activeListingsCount={activeListingsCount}
              boardSlug={getBoardSlug(listing)}
            />

            <ListingPageListingInfoSection
              listing={listing}
              closingDate={closingDate}
              t={t}
              formatDate={formatDateWithLocale}
              onCopyLink={handleCopyLink}
              onShare={handleShare}
              canShare={canShare}
            />
          </div>
        </div>

        {listing && <SimilarListings listingId={listing.id} />}
      </div>

      <ListingPageImageModal
        isOpen={isImageModalOpen}
        images={images}
        currentIndex={modalImageIndex}
        imageAltTitle={imageAltTitle}
        imageErrors={imageErrors}
        onClose={closeImageModal}
        onNext={nextImage}
        onPrev={prevImage}
        onIndexChange={setModalImageIndex}
        onImageError={(index) => setImageErrors((prev) => new Set(prev).add(index))}
      />

      <PromotionModal
        isOpen={promotionModalOpen}
        onClose={() => setPromotionModalOpen(false)}
        onSelect={handlePromotionSelect}
        isAdmin={false}
      />
    </>
  );
}

export default function ListingPageClient({
  listingId,
  initialListing,
}: {
  listingId: string;
  initialListing: Listing | null;
}) {
  const { t } = useTranslation();
  const state = useListingPageClient(listingId, initialListing);
  if (!state.listing && !state.showSkeleton) return null;
  if (!state.listing || state.showSkeleton) return <ListingPageSkeleton t={t} />;
  return <ListingPageMainContent {...state} />;
}
