'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';

import { ListingPageActions } from '@/components/ListingPage/ListingPageActions';
import { ListingPageBreadcrumbs } from '@/components/ListingPage/ListingPageBreadcrumbs';
import { ListingPageCharacteristics } from '@/components/ListingPage/ListingPageCharacteristics';
import { ListingPageDescription } from '@/components/ListingPage/ListingPageDescription';
import { ListingPageHeader } from '@/components/ListingPage/ListingPageHeader';
import { ListingPageImageModal } from '@/components/ListingPage/ListingPageImageModal';
import {
  ListingPageImages,
  type ListingPageImagesHandle,
} from '@/components/ListingPage/ListingPageImages';
import { ListingPageSeller } from '@/components/ListingPage/ListingPageSeller';
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
import { useImageRetry } from '@/hooks/useImageRetry';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing } from '@/lib/api';
import { reportImageLoadFailure } from '@/lib/image-failure-monitor';
import { listingHasAnyDescription } from '@/lib/listingDescriptionLocale';
import {
  formatDate,
  formatMileage,
  formatRegistrationType,
  getTireModelDisplayLabel,
  isTireListing,
} from '@/lib/utils';
import { Spinner } from '@/ui';

import { ListingPageHistorySection } from './ListingPageHistorySection';
import { listingPageShowsHeaderDivider } from './listing-page-header-divider';
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
      <div className="space-y-3 wrap-break-word">
        {listing.views !== undefined && listing.views > 0 && (
          <div className="flex items-center gap-2 text-base min-w-0">
            <svg
              className="w-4 h-4 text-primary-400 shrink-0"
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
            <span className="font-semibold text-primary-700 shrink-0">
              {t('listingDetail.views')}:
            </span>
            <span
              className="min-w-0 wrap-break-word"
              style={{ color: 'rgb(var(--text-secondary-rgb))' }}
            >
              {listing.views}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-base min-w-0">
          <svg
            className="w-4 h-4 text-primary-400 shrink-0"
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
          <span className="font-semibold text-primary-700 shrink-0">
            {t('listingDetail.updated')}:
          </span>
          <span
            className="min-w-0 wrap-break-word"
            style={{ color: 'rgb(var(--text-secondary-rgb))' }}
          >
            {formatDate(listing.last_updated_at)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-base min-w-0">
          <svg
            className="w-4 h-4 text-primary-400 shrink-0"
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
          <span className="font-semibold text-primary-700 shrink-0">
            {t('listingDetail.willClose')}:
          </span>
          <span
            className="min-w-0 wrap-break-word"
            style={{ color: 'rgb(var(--text-secondary-rgb))' }}
          >
            {formatDate(closingDate)}
          </span>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-primary-500/20 space-y-2">
        <button
          onClick={onCopyLink}
          className="w-full min-h-12 px-8 py-2 md:py-2.5 text-base rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 border-2 border-primary-700 bg-primary-500/10! select-none"
          data-testid="listing-detail-copy-link"
        >
          <svg
            className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0"
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
            className="w-full min-h-12 px-8 py-2 md:py-2.5 text-base rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 border-2 border-primary-700 bg-primary-500/10! select-none"
          >
            <svg
              className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0"
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

function ListingPageSkeleton({ t }: { t: (k: string) => string }) {
  return (
    <>
      <div className="max-w-6xl mx-auto" data-testid="listing-detail-page">
        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-8 lg:gap-6">
          <div className="space-y-6 order-1">
            <div>
              <MainImageSkeleton />
              <ThumbnailsSkeleton />
            </div>
          </div>
          <div className="order-2 lg:order-3 lg:col-span-2">
            <BreadcrumbsSkeleton />
          </div>
          <div className="space-y-6 order-3 lg:order-2">
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
        <div className="my-6 border-t-0 lg:border-t border-primary-500/20"></div>
        <Spinner size="md" text={t('common.loading')} />
      </div>
    </>
  );
}

function useListingPageGalleryKeyboard(
  previewRef: RefObject<ListingPageImagesHandle | null>,
  imagesLength: number,
  isImageModalOpen: boolean,
): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        previewRef.current?.goPrev();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        previewRef.current?.goNext();
      }
    };

    if (!isImageModalOpen && imagesLength > 1) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imagesLength, isImageModalOpen, previewRef]);
}

function listingPagePrimaryHeadingTitle(listing: Listing, t: (k: string) => string): string {
  if (isTireListing(listing)) {
    const tire = listing.tire;
    const tireTitleParts =
      tire && [tire.brand?.name, getTireModelDisplayLabel(tire)].filter(Boolean);
    return (
      (tireTitleParts?.length ? tireTitleParts.join(' ') : listing.title) ||
      t('listings.defaultTitle')
    );
  }
  const vehicle = listing.vehicle;
  const brand = vehicle?.brand?.name || '';
  const model = vehicle?.model?.name || '';
  const year = vehicle?.year || '';
  const vehicleInfo = [brand, model, year].filter(Boolean).join(' ');
  return vehicleInfo || listing.title || t('listings.defaultTitle');
}

function reportListingPageImageFailure(
  scope: 'listing_page' | 'listing_modal',
  listingId: string,
  images: string[],
  index: number,
  retry: (i: number) => void,
): void {
  retry(index);
  void reportImageLoadFailure({
    scope,
    listingId,
    imageUrl: images[index] ?? '',
    imageIndex: index,
    imagesTotal: images.length,
  });
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
    displayTitle: _displayTitle,
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
    promotionAccess,
    canPromote,
    canShare,
    previousListings,
    loadingPrevious,
    activeListingsCount,
    handleToggleComparison,
    showCompare,
    handleToggleFavorite,
    handlePromoteClick,
    handleCopyLink,
    handleShare,
    handlePromotionSelect,
    openImageModal,
    closeImageModal,
  } = props;
  const previewRef = useRef<ListingPageImagesHandle>(null);

  const images =
    listing?.images && listing.images.length > 0 ? listing.images : ['/placeholder-car.jpg'];
  const { onImageError: retryImageError } = useImageRetry(
    images,
    imageErrors,
    setImageErrors,
    75,
    1200,
  );

  useListingPageGalleryKeyboard(previewRef, images.length, isImageModalOpen);
  if (!listing) return null;

  const closingDate = getClosingDate(listing.last_updated_at);
  const h1Title = listingPagePrimaryHeadingTitle(listing, t);

  const nextImage = () => setModalImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setModalImageIndex((prev) => (prev - 1 + images.length) % images.length);
  const handlePageImageError = (index: number) =>
    reportListingPageImageFailure('listing_page', listing.id, images, index, retryImageError);
  const handleModalImageError = (index: number) =>
    reportListingPageImageFailure('listing_modal', listing.id, images, index, retryImageError);

  return (
    <>
      <div className="max-w-6xl mx-auto" data-testid="listing-detail-page">
        <div className="grid grid-cols-1 lg:grid-cols-[1.86fr_1fr] gap-8 lg:gap-6">
          <div className="space-y-6 min-w-0 order-1" data-testid="listing-detail-gallery">
            <ListingPageImages
              ref={previewRef}
              images={images}
              imageAltTitle={imageAltTitle}
              currentImageIndex={currentImageIndex}
              setCurrentImageIndex={setCurrentImageIndex}
              imageErrors={imageErrors}
              onImageError={handlePageImageError}
              onImageClick={openImageModal}
              coverBlurHash={listing.cover_blur_hash}
              imageBlurHashes={listing.image_blur_hashes}
            />
          </div>

          <div
            className="order-2 lg:order-3 lg:col-span-2"
            data-testid="listing-detail-breadcrumbs"
          >
            <ListingPageBreadcrumbs listing={listing} />
          </div>

          <div className="space-y-6 min-w-0 order-3 lg:order-2" data-testid="listing-detail-header">
            <ListingPageHeader listing={listing} title={h1Title} />
            {listingPageShowsHeaderDivider(listing) && (
              <div className="border-t border-primary-500/20" />
            )}
            <div data-testid="listing-detail-actions">
              <ListingPageActions
                listing={listing}
                isInitialized={isInitialized}
                isInComparison={isInComparison}
                isFavorite={isFavorite}
                isOwnListing={isOwnListing}
                canPromote={canPromote}
                showPromoteButton={getShowPromoteButton(listing, user?.id)}
                showCompare={showCompare}
                onToggleComparison={handleToggleComparison}
                onToggleFavorite={handleToggleFavorite}
                onPromoteClick={handlePromoteClick}
              />
            </div>
          </div>
        </div>

        <div className="my-6 border-t-0 lg:border-t border-primary-500/20"></div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.86fr_1fr] gap-6">
          <div className="space-y-6 min-w-0">
            {(listing.vehicle || isTireListing(listing)) && (
              <div data-testid="listing-detail-characteristics">
                <ListingPageCharacteristics listing={listing} />
              </div>
            )}

            {!isTireListing(listing) && (
              <div data-testid="listing-detail-condition-registration">
                <ListingPageConditionRegistrationSection
                  listing={listing}
                  t={t}
                  formatRegistrationType={formatRegistrationType}
                />
              </div>
            )}

            {!isTireListing(listing) && (
              <div data-testid="listing-detail-equipment">
                <ListingPageEquipmentSection equipmentColumns={equipmentColumns} t={t} />
              </div>
            )}

            {listingHasAnyDescription(listing) && (
              <div data-testid="listing-detail-description">
                <ListingPageDescription descriptionHtml={descriptionHtml} />
              </div>
            )}

            {!isTireListing(listing) && (
              <ListingPageHistorySection
                listing={listing}
                loadingPrevious={loadingPrevious}
                previousListings={previousListings}
                router={router}
                t={t}
                formatDate={formatDateWithLocale}
                formatMileage={formatMileage}
              />
            )}
          </div>

          <div className="space-y-6 min-w-0">
            <div data-testid="listing-detail-seller">
              <ListingPageSeller
                listing={listing}
                listingId={id}
                activeListingsCount={activeListingsCount}
                boardSlug={getBoardSlug(listing)}
              />
            </div>

            <div data-testid="listing-detail-info">
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
        onImageError={handleModalImageError}
      />

      <PromotionModal
        isOpen={promotionModalOpen}
        onClose={() => setPromotionModalOpen(false)}
        onSelect={handlePromotionSelect}
        isAdmin={false}
        showPartnerBalanceOption={promotionAccess?.isPartner === true}
        disableStandardOptions={promotionAccess?.isPartner === true}
        partnerBalance={promotionAccess?.freePromotionBalance ?? 0}
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
