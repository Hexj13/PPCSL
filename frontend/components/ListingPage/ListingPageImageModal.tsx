'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { getOptimizedImageUrl } from '@/lib/utils';
import { Spinner } from '@/ui';

interface ListingPageImageModalProps {
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

/* eslint-disable max-lines-per-function -- modal has two-layer image stack, scroll lock, preload, viewport logic */
export function ListingPageImageModal({
  isOpen,
  images,
  currentIndex,
  imageAltTitle,
  imageErrors,
  onClose,
  onNext,
  onPrev,
  onIndexChange: _onIndexChange,
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

  const [showSpinner, setShowSpinner] = useState(false);
  const spinnerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pinchScale, setPinchScale] = useState(1);
  const initialPinchDistanceRef = useRef<number>(0);
  const pinchStartScaleRef = useRef(1);
  const isPinchingRef = useRef(false);
  const pinchScaleRef = useRef(1);
  pinchScaleRef.current = pinchScale;

  const getPinchDistance = (t1: Touch, t2: Touch) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

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
    if (!isOpen) setPinchScale(1);
  }, [isOpen]);

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

  const minSwipeDistance = 50;
  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  onNextRef.current = onNext;
  onPrevRef.current = onPrev;
  const imagesLengthRef = useRef(images.length);
  imagesLengthRef.current = images.length;

  useEffect(() => {
    const container = swipeContainerRef.current;
    if (!isOpen || !container) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchEndX.current = null;
      touchStartX.current = e.touches[0].clientX;
      if (isMobileViewport && e.touches.length === 2) {
        isPinchingRef.current = true;
        initialPinchDistanceRef.current = getPinchDistance(e.touches[0], e.touches[1]);
        pinchStartScaleRef.current = pinchScaleRef.current;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isMobileViewport && e.touches.length === 2 && isPinchingRef.current) {
        e.preventDefault();
        const dist = getPinchDistance(e.touches[0], e.touches[1]);
        const scale = Math.min(
          4,
          Math.max(1, (pinchStartScaleRef.current * dist) / initialPinchDistanceRef.current),
        );
        setPinchScale(scale);
        return;
      }
      touchEndX.current = e.touches[0]?.clientX ?? null;
    };

    const resetPinchIfNeeded = (e: TouchEvent) => {
      if (e.touches.length < 2 && isPinchingRef.current) {
        isPinchingRef.current = false;
        setPinchScale(1);
        return true;
      }
      return false;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (resetPinchIfNeeded(e)) return;
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
      resetPinchIfNeeded(e);
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

  if (!isOpen) return null;

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

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClose();
        }
      }}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, img')) return;
        if (swipeHandledRef.current) {
          swipeHandledRef.current = false;
          return;
        }
        onClose();
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 text-primary-700 hover-only:hover:text-primary-900 transition-colors z-10 p-2"
      >
        <svg
          className="w-11 h-11 sm:w-12 sm:h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-primary-900 transition-all duration-200 z-10 bg-primary-500 rounded-full p-3 sm:p-4 border-2 border-primary-900 shadow-lg hidden sm:block hover-only:hover:scale-110"
          >
            <svg
              className="w-8 h-8 sm:w-10 sm:h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-primary-900 transition-all duration-200 z-10 bg-primary-500 rounded-full p-3 sm:p-4 border-2 border-primary-900 shadow-lg hidden sm:block hover-only:hover:scale-110"
          >
            <svg
              className="w-8 h-8 sm:w-10 sm:h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </>
      )}

      <div
        ref={swipeContainerRef}
        className="relative max-w-7xl w-full h-full flex items-center justify-center p-4"
      >
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={
            isMobileViewport
              ? {
                  transform: `scale(${pinchScale})`,
                  transformOrigin: 'center center',
                }
              : undefined
          }
        >
          {shouldShowLoader && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <Spinner size="lg" />
            </div>
          )}

          {hasValidImage ? (
            <>
              {confirmedUrl && (
                <Image
                  key={`confirmed-${visibleIndex}`}
                  src={confirmedUrl}
                  alt={imageAltText}
                  width={1200}
                  height={900}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 95vw, 90vw"
                  className="absolute inset-0 m-auto max-w-full max-h-[90vh] w-auto h-auto object-contain opacity-100"
                  loading="eager"
                  draggable={false}
                  unoptimized={isExternalUrl(confirmedUrl)}
                  onLoad={() => {
                    modalImageLoadedRef.current.add(confirmedUrl);
                    setModalImageLoading(false);
                  }}
                  onError={() => {
                    onImageError(visibleIndex);
                    setModalImageLoading(false);
                  }}
                  data-layer="confirmed"
                />
              )}
              {pendingUrl && pendingUrl !== confirmedUrl && (
                <Image
                  key={`pending-${currentIndex}`}
                  src={pendingUrl}
                  alt={imageAltText}
                  width={1200}
                  height={900}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 95vw, 90vw"
                  className="absolute inset-0 m-auto max-w-full max-h-[90vh] w-auto h-auto object-contain opacity-0"
                  loading="eager"
                  draggable={false}
                  unoptimized={isExternalUrl(pendingUrl)}
                  onLoad={() => {
                    modalImageLoadedRef.current.add(pendingUrl);
                    setModalImageLoading(false);
                    setVisibleIndex(currentIndex);
                  }}
                  onError={() => {
                    onImageError(currentIndex);
                    setModalImageLoading(false);
                    setVisibleIndex(currentIndex);
                  }}
                  data-layer="pending"
                />
              )}
            </>
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ color: 'rgb(var(--text-secondary-rgb))' }}
            >
              <svg className="w-48 h-48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                />
              </svg>
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-primary-500 text-lg sm:text-xl font-semibold bg-black bg-opacity-50 px-4 py-2 rounded-full">
            {visibleIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
}
