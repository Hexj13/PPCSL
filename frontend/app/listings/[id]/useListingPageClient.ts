'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import { useCities } from '@/hooks/useCities';
import { useListingData } from '@/hooks/useListingData';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics, buildListingViewItemParams } from '@/lib/analytics';
import type { Listing } from '@/lib/api';
import { listingsApi, favoritesApi } from '@/lib/api';
import { prepareListingDescriptionHtml } from '@/lib/listingDescriptionHtml';
import { useAuthStore, useFavoritesStore, useComparisonStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import {
  getCityName,
  getListingDisplayTitle,
  isTireListing,
  sortOptionsByLabel,
} from '@/lib/utils';

function getClosingDate(lastUpdatedAt: string): Date {
  const date = new Date(lastUpdatedAt);
  date.setDate(date.getDate() + 90);
  return date;
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

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [canPromote, setCanPromote] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

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
    if (!currentListing?.user || !user) return false;
    return user.id === currentListing.user.id;
  }, [user, listing, initialListing]);

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

  const isLoadingListing = listing === null && !initialListing;
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
    const city = getCityName(listing.city, locale, cities);
    if (isTireListing(listing) && listing.tire) {
      const tire = listing.tire;
      const modelPart =
        tire.model?.is_other && tire.custom_model_name?.trim()
          ? tire.custom_model_name.trim()
          : tire.model?.name;
      const details = [tire.brand?.name, modelPart].filter(Boolean).join(' ').trim();
      return [listing.title, details, city].filter((v) => v && v.trim() !== '').join(' - ');
    }
    const brandName = listing.vehicle?.brand?.name;
    const modelName = listing.vehicle?.model?.name;
    const year = listing.vehicle?.year ? String(listing.vehicle.year) : null;
    const details = [brandName, modelName, year].filter(Boolean).join(' ').trim();
    return [listing.title, details, city].filter((v) => v && v.trim() !== '').join(' - ');
  }, [listing, locale, cities]);

  const descriptionHtml = useMemo(() => {
    if (!listing?.description || !isHydrated || typeof window === 'undefined') return null;
    return prepareListingDescriptionHtml(listing.description, window);
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
    void checkPromotionAccess();
  }, []);

  const displayTitle = listing ? getListingDisplayTitle(listing, t) : '';
  useEffect(() => {
    if (!displayTitle) return;
    document.title = `${displayTitle} | Kupito`;
  }, [displayTitle]);

  const handleToggleFavorite = useCallback(async () => {
    if (!user) {
      if (typeof window !== 'undefined') {
        const pendingFavorites = JSON.parse(localStorage.getItem('pendingFavorites') || '[]');
        if (!pendingFavorites.includes(id)) {
          pendingFavorites.push(id);
          localStorage.setItem('pendingFavorites', JSON.stringify(pendingFavorites));
        }
        localStorage.setItem('returnUrl', `/listings/${id}`);
      }
      router.push('/sign');
      return;
    }
    if (isFavorite) {
      try {
        await favoritesApi.remove(id);
        removeFavorite(id);
        setIsFavorite(false);
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
      if (listing) {
        analytics.addToWishlist(id, buildListingViewItemParams(listing));
      }
      toast.success(t('listings.addToFavorites'));
    } catch {
      addFavorite(id);
      setIsFavorite(true);
    }
  }, [user, id, isFavorite, listing, router, t, addFavorite, removeFavorite, setIsFavorite]);

  const handleToggleComparison = useCallback(() => {
    if (!listing) return;
    const tire = isTireListing(listing);
    if (tire) {
      if (isInComparison) {
        removeTire(id);
        setIsInComparison(false);
        analytics.removeFromComparison(id, { listing_category: 'tire' });
        toast.success(t('listingDetail.removedFromComparison'));
        return;
      }
      if (tireCompareCount >= 3) {
        toast.warning(t('listingDetail.cannotCompareMoreTires'));
        return;
      }
      const added = addTire(id);
      if (added) {
        setIsInComparison(true);
        analytics.addToComparison(id, {
          title: listing.title,
          price: listing.price,
          listing_category: 'tire',
          item_category: 'Tire',
        });
        toast.success(t('listingDetail.addedToComparison'));
      } else {
        toast.error(t('listingDetail.alreadyInComparisonErrorTire'));
      }
      return;
    }
    if (isInComparison) {
      removeVehicle(id);
      setIsInComparison(false);
      analytics.removeFromComparison(id, { listing_category: 'vehicle' });
      toast.success(t('listingDetail.removedFromComparison'));
      return;
    }
    if (vehicleCompareCount >= 3) {
      toast.warning(t('listingDetail.cannotCompareMore'));
      return;
    }
    const added = addVehicle(id);
    if (added) {
      setIsInComparison(true);
      analytics.addToComparison(id, {
        title: listing?.title,
        price: listing?.price,
        listing_category: 'vehicle',
        item_category: 'Vehicle',
      });
      toast.success(t('listingDetail.addedToComparison'));
    } else {
      toast.error(t('listingDetail.alreadyInComparisonError'));
    }
  }, [
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

  const showCompare = listing ? listing.status !== 'Closed' : false;

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
    [listing, t, setListing, listingRef],
  );

  const openImageModal = useCallback((index: number) => {
    setModalImageIndex(index);
    setIsImageModalOpen(true);
  }, []);

  const closeImageModal = useCallback(() => setIsImageModalOpen(false), []);

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
    listingRef,
    handleToggleFavorite,
    handleToggleComparison,
    showCompare,
    handlePromoteClick,
    handleCopyLink,
    handleShare,
    handlePromotionSelect,
    openImageModal,
    closeImageModal,
  };
}

export type UseListingPageClientReturn = ReturnType<typeof useListingPageClient>;
