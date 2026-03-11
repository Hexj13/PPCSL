'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { getOptimizedImageUrl } from '@/lib/utils';

export interface ListingPageImageModalProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  imageAltTitle: string;
  imageErrors: Set<number>;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onIndexChange: (_index: number) => void;
  onImageError: (_index: number) => void;
}

const getPinchDistance = (t1: Touch, t2: Touch) =>
  Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

/* eslint-disable max-lines-per-function -- single modal feature: viewport, touch, keyboard, scroll lock, load, preload */
export function useListingPageImageModal({
  isOpen,
  images,
  currentIndex,
  imageAltTitle,
  imageErrors,
  onClose,
  onNext,
  onPrev,
  onImageError,
}: ListingPageImageModalProps) {
  const { t } = useTranslation();
  const [modalImageLoading, setModalImageLoading] = useState(false);
  const [visibleIndex, setVisibleIndex] = useState(currentIndex);
  const [targetImageWidth, setTargetImageWidth] = useState(1920);
  const [imageQuality, setImageQuality] = useState(85);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const modalImageLoadedRef = useRef<Set<string>>(new Set());
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const swipeHandledRef = useRef(false);
  const swipeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedScrollYRef = useRef(0);
  const prevIsOpenRef = useRef(false);
  const wasOpenRef = useRef(false);
  const lastNavigatedIndexRef = useRef(currentIndex);
  const navigationCountRef = useRef(0);
  const imagesCacheRef = useRef<HTMLImageElement[]>([]);

  const [showSpinner, setShowSpinner] = useState(false);
  const spinnerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 });
  const zoomRef = useRef({ scale: 1, x: 0, y: 0 });
  zoomRef.current = zoom;
  const pinchStartZoomRef = useRef({ scale: 1, x: 0, y: 0 });
  const pinchStartDistRef = useRef<number>(0);
  const pinchCenterRef = useRef({ x: 0, y: 0 });
  const containerRectRef = useRef<DOMRect | null>(null);
  const isPinchingRef = useRef(false);
  const panStartRef = useRef<{
    touchX: number;
    touchY: number;
    zoomX: number;
    zoomY: number;
  } | null>(null);

  const minSwipeDistance = 50;
  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  onNextRef.current = onNext;
  onPrevRef.current = onPrev;
  const imagesLengthRef = useRef(images.length);
  imagesLengthRef.current = images.length;

  useEffect(() => {
    if (modalImageLoading) {
      spinnerTimeoutRef.current = setTimeout(() => setShowSpinner(true), 300);
    } else {
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
      setShowSpinner(false);
    }
    return () => {
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
      }
    };
  }, [modalImageLoading]);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setVisibleIndex(currentIndex);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, currentIndex]);

  useEffect(() => {
    if (!isOpen) setZoom({ scale: 1, x: 0, y: 0 });
  }, [isOpen]);

  useEffect(() => {
    setZoom({ scale: 1, x: 0, y: 0 });
  }, [currentIndex]);

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }

    if (!wasOpenRef.current) {
      navigationCountRef.current = 0;
      lastNavigatedIndexRef.current = currentIndex;
      wasOpenRef.current = true;
      return;
    }

    if (lastNavigatedIndexRef.current !== currentIndex) {
      navigationCountRef.current += 1;
      lastNavigatedIndexRef.current = currentIndex;
    }
  }, [isOpen, currentIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const updateViewportSettings = () => {
      type NetworkConnection = {
        effectiveType?: string;
        saveData?: boolean;
      };

      const viewportWidth = window.innerWidth;
      const isMobile = viewportWidth <= 768;
      const connection = (navigator as Navigator & { connection?: NetworkConnection }).connection;
      const hasSlowNetwork =
        connection?.saveData === true ||
        ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '');
      const pixelRatio = Math.min(window.devicePixelRatio || 1, isMobile ? 2.2 : 3);
      const widthMultiplier = isMobile ? 1 : 1.2;
      const minWidth = isMobile ? 640 : 900;
      const maxWidth = isMobile ? (hasSlowNetwork ? 1200 : 1440) : 1920;
      const quality = isMobile ? (hasSlowNetwork ? 68 : 75) : 85;
      const computedTargetWidth = Math.min(
        maxWidth,
        Math.max(minWidth, Math.round(viewportWidth * pixelRatio * widthMultiplier)),
      );
      const normalizationStep = isMobile ? 80 : 120;
      const normalizedTargetWidth =
        Math.round(computedTargetWidth / normalizationStep) * normalizationStep;

      setTargetImageWidth((prev) => {
        if (Math.abs(prev - normalizedTargetWidth) < 50) return prev;
        return normalizedTargetWidth;
      });
      setIsMobileViewport(isMobile);
      setImageQuality((prev) => (prev === quality ? prev : quality));
    };

    updateViewportSettings();
    window.addEventListener('resize', updateViewportSettings);

    return () => {
      window.removeEventListener('resize', updateViewportSettings);
    };
  }, [isOpen]);

  useEffect(() => {
    const container = swipeContainerRef.current;
    if (!isOpen || !container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (isMobileViewport && e.touches.length === 2) {
        isPinchingRef.current = true;
        pinchStartDistRef.current = getPinchDistance(e.touches[0], e.touches[1]);
        pinchStartZoomRef.current = { ...zoomRef.current };
        pinchCenterRef.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        containerRectRef.current = swipeContainerRef.current?.getBoundingClientRect() ?? null;
        panStartRef.current = null;
        touchStartX.current = null;
        touchEndX.current = null;
      } else if (e.touches.length === 1) {
        touchEndX.current = null;
        touchStartX.current = e.touches[0].clientX;
        if (zoomRef.current.scale > 1) {
          panStartRef.current = {
            touchX: e.touches[0].clientX,
            touchY: e.touches[0].clientY,
            zoomX: zoomRef.current.x,
            zoomY: zoomRef.current.y,
          };
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isMobileViewport && e.touches.length === 2 && isPinchingRef.current) {
        e.preventDefault();
        const dist = getPinchDistance(e.touches[0], e.touches[1]);
        const ratio = dist / pinchStartDistRef.current;
        const newScale = Math.min(4, Math.max(1, pinchStartZoomRef.current.scale * ratio));
        const rect = containerRectRef.current;
        const { x: x0, y: y0, scale: s0 } = pinchStartZoomRef.current;
        const { x: mx, y: my } = pinchCenterRef.current;
        const scaleRatio = newScale / s0;
        const newX = rect ? (mx - rect.left) * (1 - scaleRatio) + x0 * scaleRatio : x0;
        const newY = rect ? (my - rect.top) * (1 - scaleRatio) + y0 * scaleRatio : y0;
        const newZoom = { scale: newScale, x: newX, y: newY };
        zoomRef.current = newZoom;
        setZoom(newZoom);
        return;
      }
      if (e.touches.length === 1) {
        if (zoomRef.current.scale > 1 && panStartRef.current) {
          e.preventDefault();
          const dx = e.touches[0].clientX - panStartRef.current.touchX;
          const dy = e.touches[0].clientY - panStartRef.current.touchY;
          const scale = zoomRef.current.scale || 1;
          const newZoom = {
            ...zoomRef.current,
            x: panStartRef.current.zoomX + dx / scale,
            y: panStartRef.current.zoomY + dy / scale,
          };
          zoomRef.current = newZoom;
          setZoom(newZoom);
          return;
        }
        touchEndX.current = e.touches[0].clientX;
      }
    };

    const finishPinch = () => {
      isPinchingRef.current = false;
      if (zoomRef.current.scale < 1.05) {
        const resetZoom = { scale: 1, x: 0, y: 0 };
        zoomRef.current = resetZoom;
        setZoom(resetZoom);
      }
      panStartRef.current = null;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isPinchingRef.current && e.touches.length < 2) {
        finishPinch();
        return;
      }
      if (zoomRef.current.scale > 1) {
        panStartRef.current = null;
        return;
      }
      if (!touchStartX.current || !touchEndX.current) return;
      const distance = touchStartX.current - touchEndX.current;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isLeftSwipe && imagesLengthRef.current > 1) {
        swipeHandledRef.current = true;
        onNextRef.current();
        if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current);
        swipeTimeoutRef.current = setTimeout(() => {
          swipeHandledRef.current = false;
        }, 400);
      }
      if (isRightSwipe && imagesLengthRef.current > 1) {
        swipeHandledRef.current = true;
        onPrevRef.current();
        if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current);
        swipeTimeoutRef.current = setTimeout(() => {
          swipeHandledRef.current = false;
        }, 400);
      }
    };

    const handleTouchCancel = (e: TouchEvent) => {
      if (isPinchingRef.current && e.touches.length < 2) {
        finishPinch();
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isOpen, isMobileViewport]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive = target.closest('button, [href]');
      if (e.key === 'Escape') {
        onClose();
      }
      if ((e.key === 'Enter' || e.key === ' ') && !isInteractive) {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'ArrowLeft') {
        onPrev();
      }
      if (e.key === 'ArrowRight') {
        onNext();
      }
    };

    const preventScroll = (e: TouchEvent) => {
      if (e.touches.length > 1) return;
      e.preventDefault();
    };

    savedScrollYRef.current = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollYRef.current}px`;
    document.body.style.width = '100%';
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, savedScrollYRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchmove', preventScroll);
      if (swipeTimeoutRef.current) {
        clearTimeout(swipeTimeoutRef.current);
        swipeTimeoutRef.current = null;
      }
      swipeHandledRef.current = false;
    };
  }, [isOpen, onClose, onNext, onPrev]);

  useEffect(() => {
    if (!isOpen) {
      setModalImageLoading(false);
      return;
    }

    const imagesList = images.length > 0 ? images : ['/placeholder-car.jpg'];
    const currentImage = imagesList[currentIndex];

    if (!currentImage || currentImage === '/placeholder-car.jpg' || imageErrors.has(currentIndex)) {
      setModalImageLoading(false);
      setVisibleIndex(currentIndex);
      return;
    }

    const optimizedUrl = getOptimizedImageUrl(currentImage, imageQuality, targetImageWidth);

    if (modalImageLoadedRef.current.has(optimizedUrl)) {
      setModalImageLoading(false);
      setVisibleIndex(currentIndex);
      return;
    }

    const loadStartTime = performance.now();
    const wasCached = modalImageLoadedRef.current.has(optimizedUrl);
    const testImg = new window.Image();
    imagesCacheRef.current.push(testImg);
    testImg.src = optimizedUrl;
    const imgIndex = currentIndex;

    if (testImg.complete && testImg.naturalWidth > 0) {
      modalImageLoadedRef.current.add(optimizedUrl);
      setModalImageLoading(false);
      setVisibleIndex(imgIndex);
      return;
    }

    setModalImageLoading(true);

    testImg.onload = () => {
      const loadTime = performance.now() - loadStartTime;
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console -- dev instrumentation
        console.debug(
          `[ImageModal] Image ${imgIndex} loaded in ${loadTime.toFixed(0)}ms, cache: ${wasCached}`,
        );
      }
      modalImageLoadedRef.current.add(optimizedUrl);
      if (imgIndex === currentIndex) {
        setModalImageLoading(false);
        setVisibleIndex(currentIndex);
      }
    };

    testImg.onerror = () => {
      if (imgIndex === currentIndex) {
        setModalImageLoading(false);
        setVisibleIndex(currentIndex);
      }
    };

    return () => {
      testImg.onload = null;
      testImg.onerror = null;
    };
  }, [currentIndex, isOpen, images, imageErrors, targetImageWidth, imageQuality]);

  const imagesCacheKey = images.join('|');

  useEffect(() => {
    modalImageLoadedRef.current.clear();
    for (const img of imagesCacheRef.current) {
      img.onload = null;
      img.onerror = null;
    }
    imagesCacheRef.current = [];
  }, [imagesCacheKey]);

  useEffect(() => {
    if (!isOpen || images.length <= 1) return;

    const nextIndex = (currentIndex + 1) % images.length;
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    const preloadImages: HTMLImageElement[] = [];
    const preloadTimeouts: Array<ReturnType<typeof setTimeout>> = [];
    const shouldWarmSecondNext = isMobileViewport && navigationCountRef.current < 2;
    const secondNextIndex = (currentIndex + 2) % images.length;

    const preloadByIndex = (index: number, delay = 0) => {
      const url = images[index];
      if (!url || url === '/placeholder-car.jpg' || imageErrors.has(index)) return;
      const optimizedUrl = getOptimizedImageUrl(url, imageQuality, targetImageWidth);
      if (modalImageLoadedRef.current.has(optimizedUrl)) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console -- dev instrumentation
          console.debug(`[ImageModal] Preload cache hit for index ${index}`);
        }
        return;
      }
      const startPreload = () => {
        const img = new window.Image();
        imagesCacheRef.current.push(img);
        img.onload = () => {
          modalImageLoadedRef.current.add(optimizedUrl);
        };
        img.src = optimizedUrl;
        preloadImages.push(img);
      };

      if (delay > 0) {
        const timeout = setTimeout(startPreload, delay);
        preloadTimeouts.push(timeout);
        return;
      }

      startPreload();
    };

    preloadByIndex(nextIndex);
    preloadByIndex(prevIndex, 120);

    if (
      shouldWarmSecondNext &&
      images.length > 2 &&
      secondNextIndex !== nextIndex &&
      secondNextIndex !== prevIndex
    ) {
      preloadByIndex(secondNextIndex, 40);
    }

    return () => {
      for (const timeout of preloadTimeouts) {
        clearTimeout(timeout);
      }
      for (const img of preloadImages) {
        img.onload = null;
      }
    };
  }, [currentIndex, isOpen, images, imageErrors, isMobileViewport, targetImageWidth, imageQuality]);

  if (!isOpen) {
    return {
      isOpen: false,
      swipeContainerRef,
      zoom,
      isMobileViewport,
      showSpinner: false,
      modalImageLoading: false,
      visibleIndex,
      currentIndex,
      modalImageLoadedRef,
      setModalImageLoading,
      setVisibleIndex,
      swipeHandledRef,
      onClose,
      onNext,
      onPrev,
      onImageError,
      images,
      imagesList: [] as string[],
      hasValidImageAt: (_index: number) => false,
      confirmedUrl: '',
      pendingUrl: '',
      hasValidImage: false,
      shouldShowLoader: false,
      imageAltText: '',
      isExternalUrl: (_url: string) => false,
    };
  }

  const imagesList = images.length > 0 ? images : ['/placeholder-car.jpg'];
  const hasValidImageAt = (index: number) => {
    const img = imagesList[index];
    return img && img !== '/placeholder-car.jpg' && !imageErrors.has(index);
  };
  const confirmedUrl = hasValidImageAt(visibleIndex)
    ? getOptimizedImageUrl(imagesList[visibleIndex], imageQuality, targetImageWidth)
    : '';
  const pendingUrl = hasValidImageAt(currentIndex)
    ? getOptimizedImageUrl(imagesList[currentIndex], imageQuality, targetImageWidth)
    : '';
  const hasValidImage = !!confirmedUrl || !!pendingUrl;
  const shouldShowLoader = showSpinner && modalImageLoading && visibleIndex === currentIndex;
  const imageAltText = t('listings.imageAltWithTotal', {
    title: imageAltTitle,
    index: (currentIndex + 1).toString(),
    total: images.length.toString(),
  });
  const isExternalUrl = (url: string) => url.startsWith('http://') || url.startsWith('https://');

  return {
    isOpen: true,
    swipeContainerRef,
    zoom,
    isMobileViewport,
    showSpinner,
    modalImageLoading,
    visibleIndex,
    currentIndex,
    modalImageLoadedRef,
    setModalImageLoading,
    setVisibleIndex,
    swipeHandledRef,
    onClose,
    onNext,
    onPrev,
    onImageError,
    images,
    imagesList,
    hasValidImageAt,
    confirmedUrl,
    pendingUrl,
    hasValidImage,
    shouldShowLoader,
    imageAltText,
    isExternalUrl,
  };
}
