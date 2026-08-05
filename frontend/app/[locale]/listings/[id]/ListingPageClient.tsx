'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useMemo, useState, type RefObject } from 'react';

import { ListingPageActions } from '@/components/ListingPage/ListingPageActions';
import { ListingPageBreadcrumbs } from '@/components/ListingPage/ListingPageBreadcrumbs';
import { ListingPageCharacteristics } from '@/components/ListingPage/ListingPageCharacteristics';
import { ListingPageConditionRegistrationSection } from '@/components/ListingPage/ListingPageConditionRegistration';
import { ListingPageDescription } from '@/components/ListingPage/ListingPageDescription';
import { ListingPageHeader } from '@/components/ListingPage/ListingPageHeader';
import { ListingPageImageModal } from '@/components/ListingPage/ListingPageImageModal';
import {
  ListingPageImages,
  type ListingPageImagesHandle,
} from '@/components/ListingPage/ListingPageImages';
import { ListingPageSeller } from '@/components/ListingPage/ListingPageSeller';
import { listingPageShowsContactCard } from '@/components/ListingPage/listingPagePromoteCard';
import { ListingDetailPageSkeleton } from '@/components/listing/ListingDetailSkeleton';
import { BreadcrumbsSkeletonDecorative } from '@/components/listing/ListingPageSkeleton';
import { SimilarListings } from '@/components/listing/SimilarListings';
import { LISTING_DETAIL_PAGE_ROOT_CLASS } from '@/components/listing/listing-detail-layout';
const PromotionModal = dynamic(
  () => import('@/components/modals/PromotionModal').then((m) => ({ default: m.PromotionModal })),
  { ssr: false },
);
import { useI18n } from '@/components/providers/I18nProvider';
import { LISTING_IMAGE_SCHEDULED_RETRY_COUNT, useImageRetry } from '@/hooks/useImageRetry';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing } from '@/lib/api';
import { getBlurForListing } from '@/lib/blur-navigation-cache';
import { reportImageLoadFailure } from '@/lib/image-failure-monitor';
import { shouldShowListingViews } from '@/lib/listing-views-visibility';
import {
  getListingDescriptionForLocale,
  listingHasAnyDescription,
} from '@/lib/listingDescriptionLocale';
import { formatDate, formatMileage, formatRegistrationType, isTireListing } from '@/lib/utils';
import { blurhashToDataURL } from '@/lib/utils/blurhash';

import { ListingPageEquipmentSection } from './ListingPageEquipmentSection';
import { ListingPageHistorySection } from './ListingPageHistorySection';
import { listingPageShowsHeaderDivider } from './listing-page-header-divider';
import {
  getBoardSlug,
  getListingPageVideoSlide,
  listingPageGalleryImages,
  listingPagePrimaryHeadingTitle,
} from './listing-page-helpers';
import { useListingPageClient, type UseListingPageClientReturn } from './useListingPageClient';

function ListingPageListingInfoSection({
  listing,
  closingDate,
  t,
  formatDate,
  onCopyLink,
  onShare,
  canShare,
  showViews,
}: {
  listing: Listing;
  closingDate: Date;
  t: (k: string) => string;
  formatDate: (d: string | Date) => string;
  onCopyLink: () => void;
  onShare: () => void;
  canShare: boolean;
  showViews: boolean;
}) {
  return (
    <div className="surface overflow-hidden">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-900">
        {t('listingDetail.listingInfo')}
      </h2>
      <div className="space-y-3 wrap-break-word">
        {showViews && (
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

function ListingPageSkeleton() {
  return <ListingDetailPageSkeleton breadcrumb={<BreadcrumbsSkeletonDecorative />} />;
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
    equipmentDisplay,
    displayTitle: _displayTitle,
    imageAltTitle,
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
    aiReportModalOpen,
    aiReportPhase,
    aiReportPayload,
    aiReportMessage,
    handleAiReportClick,
    closeAiReportModal,
  } = props;
  const previewRef = useRef<ListingPageImagesHandle>(null);
  const sellerSectionRef = useRef<HTMLDivElement>(null);
  const [contactRevealNonce, setContactRevealNonce] = useState(0);
  const listingRef = useRef(listing);
  listingRef.current = listing;
  const failureScopeRef = useRef<'listing_page' | 'listing_modal'>('listing_page');

  const descriptionLocale = locale;
  const descriptionRaw = useMemo(() => {
    if (!listing || !listingHasAnyDescription(listing)) return '';
    return getListingDescriptionForLocale(listing, descriptionLocale) ?? '';
  }, [listing, descriptionLocale]);

  const baseImages = useMemo(
    () =>
      listing?.images && listing.images.length > 0 ? listing.images : ['/placeholder-car.jpg'],
    [listing?.images],
  );

  const listingVideoSlide = useMemo(() => getListingPageVideoSlide(listing), [listing]);

  const galleryImages = useMemo(
    () => listingPageGalleryImages(listingVideoSlide, baseImages),
    [listingVideoSlide, baseImages],
  );

  const navigationBlurDataUrl = useMemo(() => {
    if (typeof window === 'undefined' || !listing?.id) return undefined;
    const nav = getBlurForListing(listing.id);
    if (!nav?.blurHash) return undefined;
    try {
      return blurhashToDataURL(nav.blurHash);
    } catch {
      return undefined;
    }
  }, [listing?.id]);
  const imagesRef = useRef(galleryImages);
  imagesRef.current = galleryImages;

  const onFinalImageFailure = useCallback((index: number, imageUrl: string) => {
    const l = listingRef.current;
    if (!l) return;
    void reportImageLoadFailure({
      scope: failureScopeRef.current,
      listingId: l.id,
      imageUrl: imageUrl || imagesRef.current[index] || '',
      imageIndex: index,
      imagesTotal: imagesRef.current.length,
      attemptsMade: LISTING_IMAGE_SCHEDULED_RETRY_COUNT,
    });
  }, []);

  const { onImageError: retryImageError } = useImageRetry(
    galleryImages,
    imageErrors,
    setImageErrors,
    75,
    1200,
    onFinalImageFailure,
  );

  const handlePageImageError = useCallback(
    (index: number) => {
      failureScopeRef.current = 'listing_page';
      retryImageError(index);
    },
    [retryImageError],
  );
  const handleModalImageError = useCallback(
    (index: number) => {
      failureScopeRef.current = 'listing_modal';
      retryImageError(index);
    },
    [retryImageError],
  );

  useListingPageGalleryKeyboard(previewRef, galleryImages.length, isImageModalOpen);

  const handleContactSellerClick = useCallback(() => {
    const el = sellerSectionRef.current ?? document.getElementById('listing-contact-info');
    if (el) {
      const offsetPosition = el.getBoundingClientRect().top + window.pageYOffset - 110;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
    setContactRevealNonce((n) => n + 1);
  }, []);

  if (!listing) return null;

  const showContact = listingPageShowsContactCard(listing, promotionAccess, isOwnListing);
  const showViews =
    shouldShowListingViews(user, isInitialized) && listing.views !== undefined && listing.views > 0;
  const closingDate = getClosingDate(listing.last_updated_at);
  const h1Title = listingPagePrimaryHeadingTitle(listing, t);

  const nextImage = () => setModalImageIndex((prev) => (prev + 1) % galleryImages.length);
  const prevImage = () =>
    setModalImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);

  return (
    <>
      <div className={LISTING_DETAIL_PAGE_ROOT_CLASS} data-testid="listing-detail-page">
        <div className="grid grid-cols-1 lg:grid-cols-[1.86fr_1fr] gap-8 lg:gap-6">
          <div className="space-y-6 min-w-0 order-1" data-testid="listing-detail-gallery">
            <ListingPageImages
              ref={previewRef}
              images={galleryImages}
              videoSlide={listingVideoSlide}
              imageAltTitle={imageAltTitle}
              currentImageIndex={currentImageIndex}
              setCurrentImageIndex={setCurrentImageIndex}
              imageErrors={imageErrors}
              onImageError={handlePageImageError}
              onImageClick={openImageModal}
              coverBlurHash={listing.cover_blur_hash}
              imageBlurHashes={listing.image_blur_hashes}
              navigationBlurDataUrl={navigationBlurDataUrl}
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
                showCompare={showCompare}
                onAiReportClick={!isTireListing(listing) ? handleAiReportClick : undefined}
                onToggleComparison={handleToggleComparison}
                onToggleFavorite={handleToggleFavorite}
                onPromoteClick={handlePromoteClick}
                promotionAccess={promotionAccess}
                showContact={showContact}
                onContactSellerClick={handleContactSellerClick}
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
                  locale={locale}
                  formatRegistrationType={formatRegistrationType}
                />
              </div>
            )}

            {!isTireListing(listing) && (
              <div data-testid="listing-detail-equipment">
                <ListingPageEquipmentSection equipmentDisplay={equipmentDisplay} t={t} />
              </div>
            )}

            {descriptionRaw ? (
              <div data-testid="listing-detail-description">
                <ListingPageDescription rawHtml={descriptionRaw} />
              </div>
            ) : null}

            {!isTireListing(listing) && (
              <ListingPageHistorySection
                listing={listing}
                loadingPrevious={loadingPrevious}
                previousListings={previousListings}
                router={router}
                t={t}
                formatDate={formatDateWithLocale}
                formatMileage={formatMileage}
                aiReportModalOpen={aiReportModalOpen}
                aiReportPhase={aiReportPhase}
                aiReportPayload={aiReportPayload}
                aiReportMessage={aiReportMessage}
                onCloseAiReportModal={closeAiReportModal}
              />
            )}
          </div>

          <div className="space-y-6 min-w-0">
            <div ref={sellerSectionRef} data-testid="listing-detail-seller">
              <ListingPageSeller
                listing={listing}
                listingId={id}
                activeListingsCount={activeListingsCount}
                boardSlug={getBoardSlug(listing)}
                contactRevealNonce={contactRevealNonce}
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
                showViews={showViews}
              />
            </div>
          </div>
        </div>

        {listing && <SimilarListings listingId={listing.id} />}
      </div>

      <ListingPageImageModal
        isOpen={isImageModalOpen}
        images={galleryImages}
        listingVideoSlide={listingVideoSlide}
        currentIndex={modalImageIndex}
        imageAltTitle={imageAltTitle}
        imageErrors={imageErrors}
        coverBlurHash={listing.cover_blur_hash}
        imageBlurHashes={listing.image_blur_hashes ?? undefined}
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
  const state = useListingPageClient(listingId, initialListing);
  if (state.showSkeleton || !state.listing) {
    return <ListingPageSkeleton />;
  }
  return <ListingPageMainContent {...state} />;
}
