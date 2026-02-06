'use client';

import createDOMPurify from 'dompurify';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { useI18n } from '@/components/I18nProvider';
import { ListingPageActions } from '@/components/ListingPage/ListingPageActions';
import { ListingPageCharacteristics } from '@/components/ListingPage/ListingPageCharacteristics';
import { ListingPageDescription } from '@/components/ListingPage/ListingPageDescription';
import { ListingPageHeader } from '@/components/ListingPage/ListingPageHeader';
import { ListingPageImageModal } from '@/components/ListingPage/ListingPageImageModal';
import { ListingPageImages } from '@/components/ListingPage/ListingPageImages';
import { ListingPageSeller } from '@/components/ListingPage/ListingPageSeller';
import {
  BreadcrumbsSkeleton,
  MainImageSkeleton,
  ThumbnailsSkeleton,
  PriceSkeleton,
  FavoriteButtonSkeleton,
  TitleSkeleton,
  BadgesSkeleton,
} from '@/components/ListingPageSkeleton';
import { PromotionModal } from '@/components/PromotionModal';
import { SimilarListings } from '@/components/SimilarListings';
import { useCities } from '@/hooks/useCities';
import { useListingData } from '@/hooks/useListingData';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { listingsApi, Listing, favoritesApi } from '@/lib/api';
import { useAuthStore, useFavoritesStore, useComparisonStore } from '@/lib/store';
import {
  formatDate,
  formatMileage,
  formatRegistrationType,
  getCityName,
  getListingDisplayTitle,
  getOptimizedImageUrl,
} from '@/lib/utils';
import { LoadingSpinner, Spinner } from '@/ui';

export default function ListingPageClient({
  listingId,
  initialListing,
}: {
  listingId: string;
  initialListing: Listing | null;
}) {
  const router = useRouter();
  const id = listingId;
  const { user, isInitialized } = useAuthStore();
  const { add: addFavorite, remove: removeFavorite } = useFavoritesStore();
  const { t } = useTranslation();
  const { locale } = useI18n();
  const { cities } = useCities();
  const {
    add: addComparison,
    remove: removeComparison,
    count: comparisonCount,
  } = useComparisonStore();

  const {
    listing,
    setListing,
    isFavorite,
    setIsFavorite,
    isInComparison,
    setIsInComparison,
    previousListings,
    loadingPrevious,
    activeListingsCount,
    listingRef,
  } = useListingData({
    listingId: id,
    initialListing,
    onListingUpdate: () => {
      setCurrentImageIndex(0);
      setImageErrors(new Set());
    },
  });

  const isOwnListing = useMemo(() => {
    const currentListing = listing || initialListing;
    if (!currentListing?.user) {
      return false;
    }
    if (!user) {
      return false;
    }
    return user.id === currentListing.user.id;
  }, [user, listing, initialListing]);

  const isLoadingListing = listing === null && !initialListing;
  const { visible: showSkeleton } = useLoadingState({
    isLoading: isLoadingListing,
    immediate: true,
    minDisplayTime: 1000,
  });
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [showHistoryHint, setShowHistoryHint] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [canPromote, setCanPromote] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && listing) {
      const toastMessage = sessionStorage.getItem('listingCreatedToast');
      if (toastMessage) {
        sessionStorage.removeItem('listingCreatedToast');
        toast.success(toastMessage);
      }
    }
  }, [isHydrated, listing]);

  const imageAltTitle = useMemo(() => {
    if (!listing) return '';
    const brandName = listing.vehicle?.brand?.name;
    const modelName = listing.vehicle?.model?.name;
    const year = listing.vehicle?.year ? String(listing.vehicle.year) : null;
    const city = getCityName(listing.city, locale, cities);
    const details = [brandName, modelName, year].filter(Boolean).join(' ').trim();
    return [listing.title, details, city].filter((v) => v && v.trim() !== '').join(' - ');
  }, [listing, locale, cities]);

  const descriptionHtml = useMemo(() => {
    if (!listing?.description || !isHydrated) return null;

    const DOMPurify = createDOMPurify(window);
    return DOMPurify.sanitize(listing.description, {
      ALLOWED_TAGS: ['p', 'br', 'div', 'strong', 'em', 'i', 'b', 'u', 'ul', 'ol', 'li', 'font'],
      ALLOWED_ATTR: ['size'],
    });
  }, [isHydrated, listing?.description]);

  useEffect(() => {
    const checkPromotionAccess = async () => {
      try {
        const res = await listingsApi.getPromotionAccess();
        setCanPromote(res.data.canPromote);
      } catch {
        setCanPromote(false);
      }
    };
    checkPromotionAccess();
  }, []);

  const displayTitle = listing ? getListingDisplayTitle(listing, t) : '';
  useEffect(() => {
    if (!displayTitle) return;
    document.title = `${displayTitle} | Kupito`;
  }, [displayTitle]);

  const handleToggleFavorite = async () => {
    if (!user) {
      if (typeof window !== 'undefined') {
        const pendingFavorites = JSON.parse(localStorage.getItem('pendingFavorites') || '[]');
        if (!pendingFavorites.includes(id)) {
          pendingFavorites.push(id);
          localStorage.setItem('pendingFavorites', JSON.stringify(pendingFavorites));
        }
        const returnUrl = `/listings/${id}`;
        localStorage.setItem('returnUrl', returnUrl);
      }
      router.push('/login');
      return;
    }

    if (isFavorite) {
      try {
        await favoritesApi.remove(id);
        removeFavorite(id);
        setIsFavorite(false);
        analytics.removeFromWishlist(id);
        toast.success(t('listingDetail.removeFromFavorites'));
      } catch {
        removeFavorite(id);
        setIsFavorite(false);
      }
      return;
    }

    if (listing && user && listing.user && user.id === listing.user.id) {
      return;
    }

    try {
      await favoritesApi.add(id);
      addFavorite(id);
      setIsFavorite(true);
      analytics.addToWishlist(id, {
        title: listing?.title,
        price: listing?.price,
      });
      toast.success(t('listingDetail.addToFavorites'));
    } catch {
      addFavorite(id);
      setIsFavorite(true);
    }
  };

  const handleToggleComparison = () => {
    if (!user) {
      if (typeof window !== 'undefined') {
        const pendingComparisons = JSON.parse(localStorage.getItem('pendingComparisons') || '[]');
        if (!pendingComparisons.includes(id)) {
          pendingComparisons.push(id);
          localStorage.setItem('pendingComparisons', JSON.stringify(pendingComparisons));
        }
        const returnUrl = `/listings/${id}`;
        localStorage.setItem('returnUrl', returnUrl);
      }
      router.push('/login');
      return;
    }

    if (isInComparison) {
      removeComparison(id);
      setIsInComparison(false);
      analytics.removeFromComparison(id);
      toast.success(t('listingDetail.removedFromComparison'));
      return;
    }

    if (comparisonCount() >= 3) {
      toast.error(t('listingDetail.cannotCompareMore'));
      return;
    }

    const added = addComparison(id);
    if (added) {
      setIsInComparison(true);
      analytics.addToComparison(id, {
        title: listing?.title,
        price: listing?.price,
      });
      toast.success(t('listingDetail.addedToComparison'));
    } else {
      toast.error(t('listingDetail.alreadyInComparisonError'));
    }
  };

  const handlePromoteClick = useCallback(() => {
    setPromotionModalOpen(true);
  }, []);

  const handlePromotionSelect = useCallback(
    async (days: number | null) => {
      if (!listing || days === null) {
        toast.error(t('listings.promotionNotAvailable'));
        return;
      }

      try {
        await listingsApi.togglePromotion(listing.id, true, days);
        toast.success(t('listings.promotionEnabled'));

        const updatedListing = await listingsApi.getOne(listing.id);
        setListing(updatedListing.data);
        listingRef.current = updatedListing.data;
      } catch (error: unknown) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 403) {
          toast.error(t('listings.promotionNotAvailable'));
        } else if (axiosError.response?.status === 400) {
          toast.error(t('listings.promotionOnlyActive'));
        } else {
          toast.error(t('listings.promotionError'));
        }
      } finally {
        setPromotionModalOpen(false);
      }
    },
    [listing, t, setListing, listingRef]
  );

  const openImageModal = (index: number) => {
    setModalImageIndex(index);
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
  };

  const getClosingDate = (lastUpdatedAt: string): Date => {
    const date = new Date(lastUpdatedAt);
    date.setDate(date.getDate() + 90);
    return date;
  };

  const imagesLength = listing?.images?.length || 1;

  useEffect(() => {
    if (!isImageModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsImageModalOpen(false);
      }
      if (e.key === 'ArrowLeft') {
        setModalImageIndex((prev) => (prev - 1 + imagesLength) % imagesLength);
      }
      if (e.key === 'ArrowRight') {
        setModalImageIndex((prev) => (prev + 1) % imagesLength);
      }
    };

    const preventScroll = (e: TouchEvent) => {
      if (e.touches.length > 1) return;
      e.preventDefault();
    };

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchmove', preventScroll);
    };
  }, [isImageModalOpen, imagesLength]);

  useEffect(() => {
    if (isImageModalOpen || !listing) return;

    const images =
      listing.images && listing.images.length > 0 ? listing.images : ['/placeholder-car.jpg'];

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowLeft' && images.length > 1) {
        e.preventDefault();
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
      }
      if (e.key === 'ArrowRight' && images.length > 1) {
        e.preventDefault();
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isImageModalOpen, listing]);

  useEffect(() => {
    if (!listing || typeof window === 'undefined') return;

    const images =
      listing.images && listing.images.length > 0 ? listing.images : ['/placeholder-car.jpg'];

    if (images.length <= 1) return;

    const nextIndex = (currentImageIndex + 1) % images.length;
    const nextImageUrl = images[nextIndex];

    if (!nextImageUrl || nextImageUrl === '/placeholder-car.jpg' || imageErrors.has(nextIndex)) {
      return;
    }

    const optimizedUrl = getOptimizedImageUrl(nextImageUrl, 75, 1200);
    const img = new window.Image();
    img.src = optimizedUrl;
  }, [currentImageIndex, listing, imageErrors]);

  useEffect(() => {
    if (!isImageModalOpen || !listing || typeof window === 'undefined') return;

    const images =
      listing.images && listing.images.length > 0 ? listing.images : ['/placeholder-car.jpg'];

    if (images.length <= 1) return;

    const nextIndex = (modalImageIndex + 1) % images.length;
    const nextImageUrl = images[nextIndex];

    if (!nextImageUrl || nextImageUrl === '/placeholder-car.jpg' || imageErrors.has(nextIndex)) {
      return;
    }

    const optimizedUrl = getOptimizedImageUrl(nextImageUrl, 85, 1920);
    const img = new window.Image();
    img.src = optimizedUrl;
  }, [modalImageIndex, isImageModalOpen, listing, imageErrors]);

  if (!listing && !showSkeleton) {
    return null;
  }

  if (!listing || showSkeleton) {
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

  const images =
    listing.images && listing.images.length > 0 ? listing.images : ['/placeholder-car.jpg'];
  const vehicle = listing.vehicle;
  const closingDate = getClosingDate(listing.last_updated_at);

  const brand = vehicle?.brand?.name || '';
  const model = vehicle?.model?.name || '';
  const year = vehicle?.year || '';
  const vehicleInfo = [brand, model, year].filter(Boolean).join(' ');
  const h1Title = vehicleInfo || listing.title || t('listings.defaultTitle');

  const nextImage = () => {
    setModalImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setModalImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

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
              showPromoteButton={
                !!(
                  user &&
                  listing.user &&
                  user.id === listing.user.id &&
                  listing.status === 'Active' &&
                  !listing.is_promoted
                )
              }
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

            {listing.equipment && listing.equipment.length > 0 && (
              <div className="surface overflow-hidden">
                <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-700">
                  {t('listingDetail.equipment')}
                </h2>
                <ul className="list-disc list-outside grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pl-5">
                  {listing.equipment.map((key) => (
                    <li
                      key={key}
                      className="ml-0"
                      style={{ color: 'rgb(var(--text-secondary-rgb))' }}
                    >
                      {t(`vehicleOptions.equipment.${key}`)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {listing.description && <ListingPageDescription descriptionHtml={descriptionHtml} />}

            {(listing.condition ||
              listing.registration_type ||
              listing.is_registered !== undefined) && (
              <div className="surface overflow-hidden">
                <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-700">
                  {t('listingDetail.conditionAndRegistration')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {listing.condition && (
                    <div>
                      <span className="text-primary-500 font-semibold">
                        {t('listingDetail.condition')}:
                      </span>
                      <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                        {t(`vehicleOptions.condition.${listing.condition}`)}
                      </span>
                    </div>
                  )}
                  {listing.registration_type && (
                    <div>
                      <span className="text-primary-500 font-semibold">
                        {t('listingDetail.registrationType')}:
                      </span>
                      <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                        {formatRegistrationType(listing.registration_type, t)}
                      </span>
                    </div>
                  )}
                  {listing.is_registered !== undefined && (
                    <div>
                      <span className="text-primary-500 font-semibold">
                        {t('listingDetail.registration')}:
                      </span>
                      <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                        {listing.is_registered
                          ? t('listingDetail.registered')
                          : t('listingDetail.notRegistered')}
                      </span>
                    </div>
                  )}
                  {listing.is_registered && listing.registration_expires_at && (
                    <div>
                      <span className="text-primary-500 font-semibold">
                        {t('listingDetail.registeredUntil')}:
                      </span>
                      <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                        {(() => {
                          const date = new Date(listing.registration_expires_at);
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const year = date.getFullYear();
                          return `${month}.${year}`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="surface overflow-visible">
              <div className="flex items-center gap-2 mb-4 min-w-0">
                <h2 className="text-xl md:text-2xl font-bold text-primary-700 min-w-0 break-words">
                  {listing.vin
                    ? t('listingDetail.previousListings')
                    : t('listingDetail.vehicleHistory')}
                </h2>
                {listing.vin && (
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => setShowHistoryHint(!showHistoryHint)}
                      className="focus:outline-none"
                    >
                      <svg
                        className="w-4 h-4 text-primary-400 hover:text-primary-300 cursor-help transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>
                    <div
                      className={`absolute right-0 bottom-full mb-2 ${showHistoryHint ? 'block' : 'hidden group-hover:block'} z-50 w-64`}
                    >
                      <div className="bg-bg-darker border-2 border-primary-500/50 rounded-lg p-3 shadow-lg">
                        <p
                          className="text-xs font-semibold leading-relaxed"
                          style={{ color: 'rgb(var(--text-secondary-rgb))' }}
                        >
                          {t('listingDetail.historyHint')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {!listing.vin ? (
                <div className="flex items-start gap-3 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                  <svg
                    className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <p className="font-semibold text-primary-300 text-sm mb-1">
                      {t('listingDetail.vinNotProvided')}
                    </p>
                    <p className="text-sm" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                      {t('listingDetail.vinNotProvidedDescription')}
                    </p>
                  </div>
                </div>
              ) : loadingPrevious ? (
                <div className="text-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : previousListings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-primary-500/20">
                        <th className="text-left py-2 px-2 sm:px-3 font-semibold text-xs sm:text-sm text-primary-500">
                          {t('listingDetail.title')}
                        </th>
                        <th className="text-left py-2 px-2 sm:px-3 font-semibold text-xs sm:text-sm hidden sm:table-cell text-primary-500">
                          {t('listingDetail.mileage')}
                        </th>
                        <th className="text-left py-2 px-2 sm:px-3 font-semibold text-xs sm:text-sm hidden md:table-cell text-primary-500">
                          {t('listingDetail.closedAt')}
                        </th>
                        <th className="text-left sm:text-right py-2 px-2 sm:px-3 font-semibold text-xs sm:text-sm text-primary-500"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {previousListings.map((prevListing) => (
                        <tr
                          key={prevListing.id}
                          className="border-b border-primary-500/10 hover:bg-bg-darker/50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/listings/${prevListing.id}`)}
                        >
                          <td
                            className="py-3 px-2 sm:px-3 text-xs sm:text-sm"
                            style={{ color: 'rgb(var(--text-primary-rgb))' }}
                          >
                            {prevListing.title}
                          </td>
                          <td
                            className="py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm hidden sm:table-cell"
                            style={{ color: 'rgb(var(--text-primary-rgb))' }}
                          >
                            {prevListing.vehicle?.mileage_km
                              ? `${formatMileage(prevListing.vehicle.mileage_km)} ${t('listings.km')}`
                              : '-'}
                          </td>
                          <td
                            className="py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm hidden md:table-cell"
                            style={{ color: 'rgb(var(--text-primary-rgb))' }}
                          >
                            {formatDate(prevListing.updated_at)}
                          </td>
                          <td className="py-3 px-2 sm:px-3 text-left sm:text-right">
                            <span className="text-primary-400 hover:text-primary-300 transition-colors text-xs font-medium">
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
          </div>

          <div className="space-y-6 min-w-0">
            <ListingPageSeller
              listing={listing}
              listingId={id}
              activeListingsCount={activeListingsCount}
              boardSlug={
                listing?.user
                  ? ((listing.user as { board_slug?: string; boardSlug?: string }).board_slug ??
                    (listing.user as { boardSlug?: string }).boardSlug ??
                    null)
                  : null
              }
            />

            <div className="surface overflow-hidden">
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
                    <span className="font-semibold text-primary-500 flex-shrink-0">
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
                  <span className="font-semibold text-primary-500 flex-shrink-0">
                    {t('listingDetail.updated')}:
                  </span>
                  <span
                    className="min-w-0 break-words"
                    style={{ color: 'rgb(var(--text-secondary-rgb))' }}
                  >
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
                  <span className="font-semibold text-primary-500 flex-shrink-0">
                    {t('listingDetail.willClose')}:
                  </span>
                  <span
                    className="min-w-0 break-words"
                    style={{ color: 'rgb(var(--text-secondary-rgb))' }}
                  >
                    {formatDate(closingDate)}
                  </span>
                </div>
              </div>
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
