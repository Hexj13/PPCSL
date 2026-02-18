'use client';

import createDOMPurify from 'dompurify';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

import { useI18n } from '@/components/providers/I18nProvider';
import { useCities } from '@/hooks/useCities';
import { useListingData } from '@/hooks/useListingData';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { Listing } from '@/lib/api';
import { listingsApi, favoritesApi } from '@/lib/api';
import { useAuthStore, useFavoritesStore, useComparisonStore } from '@/lib/store';
import { getCityName, getListingDisplayTitle, sortOptionsByLabel } from '@/lib/utils';

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
  const {
    add: addComparison,
    remove: removeComparison,
    count: comparisonCount,
  } = useComparisonStore();

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
    if (listing?.user && user.id === listing.user.id) return;
    try {
      await favoritesApi.add(id);
      addFavorite(id);
      setIsFavorite(true);
      analytics.addToWishlist(id, { title: listing?.title, price: listing?.price });
      toast.success(t('listingDetail.addToFavorites'));
    } catch {
      addFavorite(id);
      setIsFavorite(true);
    }
  }, [user, id, isFavorite, listing, router, t, addFavorite, removeFavorite, setIsFavorite]);

  const handleToggleComparison = useCallback(() => {
    if (!user) {
      if (typeof window !== 'undefined') {
        const pendingComparisons = JSON.parse(localStorage.getItem('pendingComparisons') || '[]');
        if (!pendingComparisons.includes(id)) {
          pendingComparisons.push(id);
          localStorage.setItem('pendingComparisons', JSON.stringify(pendingComparisons));
        }
        localStorage.setItem('returnUrl', `/listings/${id}`);
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
      analytics.addToComparison(id, { title: listing?.title, price: listing?.price });
      toast.success(t('listingDetail.addedToComparison'));
    } else {
      toast.error(t('listingDetail.alreadyInComparisonError'));
    }
  }, [
    user,
    id,
    isInComparison,
    comparisonCount,
    addComparison,
    removeComparison,
    setIsInComparison,
    listing,
    router,
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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImageModalOpen, listing]);

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
    handlePromoteClick,
    handleCopyLink,
    handleShare,
    handlePromotionSelect,
    openImageModal,
    closeImageModal,
  };
}

export type UseListingPageClientReturn = ReturnType<typeof useListingPageClient>;
