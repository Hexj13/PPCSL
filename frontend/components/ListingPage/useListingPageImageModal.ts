'use client';

import { useTranslation } from '@/hooks/useTranslation';

import { getModalDisplayUrls } from './listing-page-image-modal-urls';
import type { ListingPageImageModalProps } from './useListingPageImageModal.types';
import { useListingPageImageModalGestures } from './useListingPageImageModalGestures';
import { useListingPageImageModalKeyboard } from './useListingPageImageModalKeyboard';
import { useListingPageImageModalLoading } from './useListingPageImageModalLoading';
import { useListingPageImageModalNavigation } from './useListingPageImageModalNavigation';
import { useListingPageImageModalViewport } from './useListingPageImageModalViewport';

export type { ListingPageImageModalProps } from './useListingPageImageModal.types';

export function useListingPageImageModal({
  isOpen,
  images,
  listingVideoSlide = null,
  currentIndex,
  imageAltTitle,
  imageErrors,
  coverBlurHash,
  imageBlurHashes,
  onClose,
  onNext,
  onPrev,
  onImageError,
}: ListingPageImageModalProps) {
  const { t } = useTranslation();
  const { targetImageWidth, imageQuality, isMobileViewport } = useListingPageImageModalViewport({
    isOpen,
  });

  const navigation = useListingPageImageModalNavigation({
    isOpen,
    currentIndex,
    onClose,
    onNext,
    onPrev,
    coverBlurHash,
    imageBlurHashes,
    listingVideoSlide,
  });

  const { zoom } = useListingPageImageModalGestures({
    isOpen,
    isMobileViewport,
    swipeContainerRef: navigation.swipeContainerRef,
    swipeHandledRef: navigation.swipeHandledRef,
    swipeTimeoutRef: navigation.swipeTimeoutRef,
    syncClickLockRef: navigation.syncClickLockRef,
    visibleIndexRef: navigation.visibleIndexRef,
    currentIndexRef: navigation.currentIndexRef,
    isOpenRef: navigation.isOpenRef,
    onNextRef: navigation.onNextRef,
    onPrevRef: navigation.onPrevRef,
    imagesLength: images.length,
    currentIndex,
  });

  useListingPageImageModalKeyboard({
    isOpen,
    onClose,
    onNextRef: navigation.onNextRef,
    onPrevRef: navigation.onPrevRef,
    syncClickLockRef: navigation.syncClickLockRef,
    syncUnlockTimeoutRef: navigation.syncUnlockTimeoutRef,
    swipeHandledRef: navigation.swipeHandledRef,
    swipeTimeoutRef: navigation.swipeTimeoutRef,
  });

  const { modalImageLoadedRef, hiResRevision, markHiResLoaded } = useListingPageImageModalLoading({
    isOpen,
    images,
    currentIndex,
    imageErrors,
    targetImageWidth,
    imageQuality,
    setVisibleIndex: navigation.setVisibleIndex,
  });

  void hiResRevision;

  if (!isOpen) {
    return {
      isOpen: false,
      swipeContainerRef: navigation.swipeContainerRef,
      zoom,
      isMobileViewport,
      visibleIndex: navigation.visibleIndex,
      currentIndex,
      modalImageLoadedRef,
      markHiResLoaded,
      setVisibleIndex: navigation.setVisibleIndex,
      swipeHandledRef: navigation.swipeHandledRef,
      onClose,
      onNext: navigation.guardedNext,
      onPrev: navigation.guardedPrev,
      onImageError,
      images,
      imagesList: [] as string[],
      hasValidImageAt: (_index: number) => false,
      confirmedUrl: '',
      pendingUrl: '',
      hasValidImage: false,
      isVideoSlideActive: false,
      imageAltText: '',
      isExternalUrl: (_url: string) => false,
      getBlurDataURL: navigation.getBlurDataURL,
    };
  }

  const imagesList = images.length > 0 ? images : ['/placeholder-car.jpg'];
  const hasValidImageAt = (index: number) => {
    if (listingVideoSlide && index === 0) return true;
    const img = imagesList[index];
    return !!(img && img !== '/placeholder-car.jpg' && !imageErrors.has(index));
  };

  const isVideoPosterAt = (index: number) =>
    !!(listingVideoSlide && index === 0 && hasValidImageAt(index));

  const resolveVideoPosterUrl = (index: number) =>
    isVideoPosterAt(index) ? listingVideoSlide?.posterUrl || '' : '';

  const isHiResLoaded = (url: string) => modalImageLoadedRef.current.has(url);

  const { confirmedUrl: progressiveConfirmedUrl, pendingUrl: progressivePendingUrl } =
    hasValidImageAt(navigation.visibleIndex) && !isVideoPosterAt(navigation.visibleIndex)
      ? getModalDisplayUrls({
          visibleIndex: navigation.visibleIndex,
          currentIndex,
          imagesList,
          imageQuality,
          targetImageWidth,
          isHiResLoaded,
        })
      : { confirmedUrl: '', pendingUrl: '' };

  const confirmedUrl = isVideoPosterAt(navigation.visibleIndex)
    ? resolveVideoPosterUrl(navigation.visibleIndex)
    : progressiveConfirmedUrl;

  const pendingUrl =
    currentIndex === navigation.visibleIndex && isVideoPosterAt(currentIndex)
      ? resolveVideoPosterUrl(currentIndex)
      : progressivePendingUrl;

  const hasValidImage =
    !!(
      listingVideoSlide &&
      navigation.visibleIndex === 0 &&
      hasValidImageAt(navigation.visibleIndex)
    ) ||
    !!confirmedUrl ||
    !!pendingUrl;
  const isVideoSlideActive = !!(
    listingVideoSlide &&
    navigation.visibleIndex === 0 &&
    currentIndex === 0
  );
  const imageAltText = t('listings.imageAltWithTotal', {
    title: imageAltTitle,
    index: (currentIndex + 1).toString(),
    total: images.length.toString(),
  });
  const isExternalUrl = (url: string) => url.startsWith('http://') || url.startsWith('https://');

  return {
    isOpen: true,
    swipeContainerRef: navigation.swipeContainerRef,
    zoom,
    isMobileViewport,
    visibleIndex: navigation.visibleIndex,
    currentIndex,
    modalImageLoadedRef,
    markHiResLoaded,
    setVisibleIndex: navigation.setVisibleIndex,
    swipeHandledRef: navigation.swipeHandledRef,
    onClose,
    onNext: navigation.guardedNext,
    onPrev: navigation.guardedPrev,
    onImageError,
    images,
    imagesList,
    hasValidImageAt,
    confirmedUrl,
    pendingUrl,
    hasValidImage,
    isVideoSlideActive,
    imageAltText,
    isExternalUrl,
    getBlurDataURL: navigation.getBlurDataURL,
  };
}
