'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import { useCities } from '@/hooks/useCities';
import { useListingData } from '@/hooks/useListingData';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics, buildListingViewItemParams } from '@/lib/analytics';
import type { Listing, PromotionAccessStatus } from '@/lib/api';
import { listingsApi, favoritesApi, comparisonApi } from '@/lib/api';
import { localStorageGetItem, localStorageSetItem } from '@/lib/browser-local-storage';
import {
  publishListingDetailComparisonCrossTab,
  publishListingDetailFavoriteCrossTab,
} from '@/lib/cross-tab-listing-detail-publish';
import { buildSignInHref } from '@/lib/return-url';
import { loadSiteConfigSync } from '@/lib/site-config';
import { useAuthStore, useFavoritesStore, useComparisonStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import {
  getCityName,
  getCountry,
  getListingDisplayTitle,
  getTireModelDisplayLabel,
  isTireListing,
  sortOptionsByLabel,
} from '@/lib/utils';

import { applyListingPromotionSelection } from './applyListingPromotionSelection';
import { listingPageInitialGalleryImageIndex } from './listing-page-helpers';
import { useListingAiReport } from './useListingAiReport';
import { useListingPageCreatedToast } from './useListingPageCreatedToast';

const LISTING_LIFETIME_DAYS = 90;
const LISTING_LIFETIME_MS = LISTING_LIFETIME_DAYS * 24 * 60 * 60 * 1000;

function getClosingDate(lastUpdatedAt: string): Date {
  const base = new Date(lastUpdatedAt);
  if (Number.isNaN(base.getTime())) return base;
  return new Date(base.getTime() + LISTING_LIFETIME_MS);
}

export function useListingPageClient(listingId: string, initialListing: Listing | null) {
  const router = useRouter();
  const id = listingId;
  const { user, isInitialized } = useAuthStore();
  const { add: addFavorite, remove: removeFavorite } = useFavoritesStore();
  const { t } = useTranslation();
  const { locale } = useI18n();
  const { cities } = useCities();
  const addVehicle = useComparisonStore((s) => s.addVehicle);
  const removeVehicle = useComparisonStore((s) => s.removeVehicle);
  const addTire = useComparisonStore((s) => s.addTire);
  const removeTire = useComparisonStore((s) => s.removeTire);
  const vehicleCompareCount = useComparisonStore((s) => s.vehicleComparisons.length);
  const tireCompareCount = useComparisonStore((s) => s.tireComparisons.length);

  const [currentImageIndex, setCurrentImageIndex] = useState(() =>
    listingPageInitialGalleryImageIndex(initialListing),
  );
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [promotionAccess, setPromotionAccess] = useState<PromotionAccessStatus | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const {
    listing: listingFromApi,
    setListing,
    isFavorite,
    setIsFavorite,
    isInComparison,
    setIsInComparison,
    previousListings,
    loadingPrevious,
    activeListingsCount,
    listingRef,
    fetchListingData,
  } = useListingData({
    listingId: id,
    initialListing,
    onListingUpdate: (next, prev) => {
      const sig = (l: Listing | null) => (l?.images ?? []).join('\u0001');
      if (!prev || sig(next) !== sig(prev)) {
        setCurrentImageIndex(listingPageInitialGalleryImageIndex(next));
        setImageErrors(new Set());
      }
    },
  });

  const listing = listingFromApi ?? initialListing;

  const isOwnListing = useMemo(() => {
    if (!listing?.user || !user) return false;
    return user.id === listing.user.id;
  }, [user, listing]);

  const equipmentColumns = useMemo(() => {
    const eq = listing?.equipment;
    if (!eq?.length) return { left: [] as string[], right: [] as string[] };
    const sorted = sortOptionsByLabel(
      eq.map((key) => ({
        value: key,
        label: t(`vehicleOptions.equipment.${key}`),
      })),
    ).map((opt) => opt.value);
    const mid = Math.ceil(sorted.length / 2);
    return { left: sorted.slice(0, mid), right: sorted.slice(mid) };
  }, [listing?.equipment, t]);

  const isLoadingListing = listingFromApi === null && !initialListing;
  const { visible: showSkeleton } = useLoadingState({
    isLoading: isLoadingListing,
    immediate: true,
    minDisplayTime: 1000,
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.share) return;
    const media = window.matchMedia('(max-width: 1024px)');
    const update = () => setCanShare(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useListingPageCreatedToast(isHydrated, listing, t);

  const imageAltTitle = useMemo(() => {
    if (!listing) return '';
    const city = getCityName(listing.city, locale, cities);
    if (isTireListing(listing) && listing.tire) {
      const tire = listing.tire;
      const modelPart = getTireModelDisplayLabel(tire);
      const details = [tire.brand?.name, modelPart].filter(Boolean).join(' ').trim();
      return [listing.title, details, city].filter((v) => v && v.trim() !== '').join(' - ');
    }
    const brandName = listing.vehicle?.brand?.name;
    const modelName = listing.vehicle?.model?.name;
    const year = listing.vehicle?.year ? String(listing.vehicle.year) : null;
    const details = [brandName, modelName, year].filter(Boolean).join(' ').trim();
    return [listing.title, details, city].filter((v) => v && v.trim() !== '').join(' - ');
  }, [listing, locale, cities]);

  useEffect(() => {
    void listingsApi
      .getPromotionAccess()
      .then((res) => setPromotionAccess(res.data))
      .catch(() => setPromotionAccess(null));
  }, []);

  useEffect(() => {
    const status = listing?.video?.status;
    if (!isOwnListing || (status !== 'processing' && status !== 'pending')) {
      return;
    }
    const timer = window.setInterval(() => {
      fetchListingData(true);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [fetchListingData, isOwnListing, listing?.video?.status]);

  const canPromote =
    (promotionAccess?.canPromote ?? false) || (promotionAccess?.isPartner ?? false);
  const displayTitle = listing ? getListingDisplayTitle(listing, t) : '';
  useEffect(() => {
    if (!displayTitle) return;
    document.title = `${displayTitle} | ${loadSiteConfigSync(getCountry()).name}`;
  }, [displayTitle]);

  const handleToggleFavorite = useCallback(async () => {
    if (!user) {
      if (typeof window !== 'undefined') {
        const pendingFavorites = JSON.parse(localStorageGetItem('pendingFavorites') || '[]');
        if (!pendingFavorites.includes(id)) {
          pendingFavorites.push(id);
          localStorageSetItem('pendingFavorites', JSON.stringify(pendingFavorites));
        }
      }
      router.push(buildSignInHref(`/listings/${id}`));
      return;
    }
    if (isFavorite) {
      try {
        await favoritesApi.remove(id);
        removeFavorite(id);
        setIsFavorite(false);
        publishListingDetailFavoriteCrossTab(id, 'remove');
        analytics.removeFromWishlist(id, {
          listing_category: listing && isTireListing(listing) ? 'tire' : 'vehicle',
        });
        toast.success(t('listings.removeFromFavorites'));
      } catch {
        removeFavorite(id);
        setIsFavorite(false);
      }
      return;
    }
    if (listing?.user && user.id === listing.user.id) {
      toast.warning(t('listingDetail.cannotFavoriteOwnListingToast'));
      return;
    }
    try {
      await favoritesApi.add(id);
      addFavorite(id);
      setIsFavorite(true);
      publishListingDetailFavoriteCrossTab(id, 'add');
      if (listing) {
        analytics.addToWishlist(id, buildListingViewItemParams(listing));
      }
      toast.success(t('listings.addToFavorites'));
    } catch {
      addFavorite(id);
      setIsFavorite(true);
    }
  }, [user, id, isFavorite, listing, router, t, addFavorite, removeFavorite, setIsFavorite]);

  const handleToggleComparison = useCallback(async () => {
    if (!listing) return;
    const tire = isTireListing(listing);

    const toastApiError = (err: unknown) => {
      const fromApi =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message ===
          'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : null;
      toast.error(fromApi ?? t('common.error'));
    };

    if (tire) {
      if (isInComparison) {
        if (user) {
          try {
            await comparisonApi.remove(id);
          } catch (err) {
            toastApiError(err);
            return;
          }
        }
        removeTire(id);
        setIsInComparison(false);
        publishListingDetailComparisonCrossTab(id, 'remove', 'tire', !!user);
        analytics.removeFromComparison(id, { listing_category: 'tire' });
        toast.success(t('listingDetail.removedFromComparison'));
        return;
      }
      if (tireCompareCount >= 3) {
        toast.warning(t('listingDetail.cannotCompareMoreTires'));
        return;
      }
      const added = addTire(id);
      if (!added) {
        toast.error(t('listingDetail.alreadyInComparisonErrorTire'));
        return;
      }
      if (user) {
        try {
          await comparisonApi.add(id);
        } catch (err) {
          removeTire(id);
          toastApiError(err);
          return;
        }
      }
      setIsInComparison(true);
      publishListingDetailComparisonCrossTab(id, 'add', 'tire', !!user);
      analytics.addToComparison(id, {
        title: listing.title,
        price: listing.price,
        listing_category: 'tire',
        item_category: 'Tire',
      });
      toast.success(t('listingDetail.addedToComparison'));
      return;
    }
    if (isInComparison) {
      if (user) {
        try {
          await comparisonApi.remove(id);
        } catch (err) {
          toastApiError(err);
          return;
        }
      }
      removeVehicle(id);
      setIsInComparison(false);
      publishListingDetailComparisonCrossTab(id, 'remove', 'vehicle', !!user);
      analytics.removeFromComparison(id, { listing_category: 'vehicle' });
      toast.success(t('listingDetail.removedFromComparison'));
      return;
    }
    if (vehicleCompareCount >= 3) {
      toast.warning(t('listingDetail.cannotCompareMore'));
      return;
    }
    const added = addVehicle(id);
    if (!added) {
      toast.error(t('listingDetail.alreadyInComparisonError'));
      return;
    }
    if (user) {
      try {
        await comparisonApi.add(id);
      } catch (err) {
        removeVehicle(id);
        toastApiError(err);
        return;
      }
    }
    setIsInComparison(true);
    publishListingDetailComparisonCrossTab(id, 'add', 'vehicle', !!user);
    analytics.addToComparison(id, {
      title: listing?.title,
      price: listing?.price,
      listing_category: 'vehicle',
      item_category: 'Vehicle',
    });
    toast.success(t('listingDetail.addedToComparison'));
  }, [
    user,
    id,
    isInComparison,
    vehicleCompareCount,
    tireCompareCount,
    addVehicle,
    removeVehicle,
    addTire,
    removeTire,
    setIsInComparison,
    listing,
    t,
  ]);

  const handlePromoteClick = useCallback(() => setPromotionModalOpen(true), []);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t('listingDetail.linkCopied'));
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success(t('listingDetail.linkCopied'));
    }
  }, [t]);

  const handleShare = useCallback(async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: listing?.title ?? '',
        url: window.location.href,
      });
    } catch {
      // AbortError
    }
  }, [listing?.title]);

  const handlePromotionSelect = useCallback(
    async (days: number | null) => {
      if (!listing) return;
      await applyListingPromotionSelection({
        listing,
        days,
        setListing,
        listingRef,
        t,
        setPromotionModalOpen,
      });
    },
    [listing, t, setListing, listingRef],
  );

  const openImageModal = useCallback((index: number) => {
    setModalImageIndex(index);
    setIsImageModalOpen(true);
  }, []);

  const closeImageModal = useCallback(() => setIsImageModalOpen(false), []);

  const {
    aiReportModalOpen,
    aiReportPhase,
    aiReportPayload,
    aiReportMessage,
    handleAiReportClick,
    closeAiReportModal,
  } = useListingAiReport({
    listingId: id,
    listing,
    user,
    isInitialized,
    locale,
    isHydrated,
    router,
  });

  return {
    router,
    listing,
    id,
    user,
    isInitialized,
    showSkeleton,
    isOwnListing,
    isFavorite,
    isInComparison,
    equipmentColumns,
    displayTitle,
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
    canPromote,
    canShare,
    previousListings,
    loadingPrevious,
    activeListingsCount,
    listingRef,
    handleToggleFavorite,
    handleToggleComparison,
    showCompare: listing ? listing.status !== 'Closed' : false,
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
  };
}

export type UseListingPageClientReturn = ReturnType<typeof useListingPageClient>;
