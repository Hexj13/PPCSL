'use client';

import Image from 'next/image';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useListingImages } from '@/hooks/useListingImages';
import { useTranslation } from '@/hooks/useTranslation';
import { getOptimizedImageUrl } from '@/lib/utils';
import { Spinner } from '@/ui';

const RESET_TO_FIRST_DELAY_MS = 10000;
const REWIND_STEP_MS = 220;
const IMAGE_SLIDE_DURATION_MS = 220;

const PLACEHOLDER_SVG = (
  <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
    />
  </svg>
);

function renderPreviewImage(
  index: number,
  params: {
    images: string[];
    imageErrors: Set<number>;
    imageAltTitle: string;
    currentImageIndex: number;
    showMainImageLoader: boolean;
    handleImageLoad: (_idx: number) => void;
    onImageError: (_idx: number) => void;
    isAnimating: boolean;
    t: (_key: string, _params?: Record<string, string>) => string;
  },
) {
  const {
    images,
    imageErrors,
    imageAltTitle,
    currentImageIndex,
    showMainImageLoader,
    handleImageLoad,
    onImageError,
    isAnimating,
    t,
  } = params;
  const src = images[index];
  const hasError = imageErrors.has(index);

  if (!src || src === '/placeholder-car.jpg' || hasError) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {PLACEHOLDER_SVG}
      </div>
    );
  }

  const optimizedUrl = getOptimizedImageUrl(src, 75, 1200);
  const isExternal = optimizedUrl.startsWith('http://') || optimizedUrl.startsWith('https://');
  const isCurrent = index === currentImageIndex;
  const useNextImage = index === 0 && !isAnimating;

  if (!useNextImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={`preview-native-${index}`}
        src={optimizedUrl}
        alt={t('listings.imageAltWithTotal', {
          title: imageAltTitle,
          index: String(index + 1),
          total: String(images.length),
        })}
        decoding="sync"
        draggable={false}
        onLoad={() => handleImageLoad(index)}
        onError={() => onImageError(index)}
        className={`object-cover ${isCurrent && showMainImageLoader ? 'opacity-0' : 'opacity-100 transition-opacity duration-200'}`}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    );
  }

  return (
    <Image
      key={`preview-slide-${index}`}
      src={optimizedUrl}
      alt={t('listings.imageAltWithTotal', {
        title: imageAltTitle,
        index: String(index + 1),
        total: String(images.length),
      })}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 65vw"
      className={`object-cover ${isCurrent && showMainImageLoader ? 'opacity-0' : 'opacity-100 transition-opacity duration-200'}`}
      loading={undefined}
      priority={true}
      draggable={false}
      unoptimized={isExternal}
      onLoad={() => handleImageLoad(index)}
      onError={() => onImageError(index)}
    />
  );
}

function renderPreviewSlides(params: {
  animState: {
    fromIndex: number;
    toIndex: number;
    direction: 'next' | 'prev';
    phase: 'setup' | 'running';
  } | null;
  currentImageIndex: number;
  images: string[];
  imageErrors: Set<number>;
  imageAltTitle: string;
  showMainImageLoader: boolean;
  handleImageLoad: (_idx: number) => void;
  onImageError: (_idx: number) => void;
  t: (_key: string, _params?: Record<string, string>) => string;
}) {
  const {
    animState,
    currentImageIndex,
    images,
    imageErrors,
    imageAltTitle,
    showMainImageLoader,
    handleImageLoad,
    onImageError,
    t,
  } = params;

  const slideParams = {
    images,
    imageErrors,
    imageAltTitle,
    currentImageIndex,
    showMainImageLoader,
    handleImageLoad,
    onImageError,
    t,
  };

  if (!animState) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        {renderPreviewImage(currentImageIndex, { ...slideParams, isAnimating: false })}
      </div>
    );
  }

  const { fromIndex, toIndex, direction, phase } = animState;
  const isRunning = phase === 'running';
  const transitionStyle = isRunning ? `transform ${IMAGE_SLIDE_DURATION_MS}ms ease-out` : 'none';
  const enterOffset = direction === 'next' ? '100%' : '-100%';
  const leaveTarget = direction === 'next' ? '-100%' : '100%';

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: isRunning ? `translateX(${leaveTarget})` : 'translateX(0%)',
          transition: transitionStyle,
        }}
      >
        {renderPreviewImage(fromIndex, { ...slideParams, isAnimating: true })}
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: isRunning ? 'translateX(0%)' : `translateX(${enterOffset})`,
          transition: transitionStyle,
        }}
      >
        {renderPreviewImage(toIndex, { ...slideParams, isAnimating: true })}
      </div>
    </div>
  );
}

interface ListingPageImagesProps {
  images: string[];
  imageAltTitle: string;
  currentImageIndex: number;
  setCurrentImageIndex: React.Dispatch<React.SetStateAction<number>>;
  imageErrors: Set<number>;
  onImageError: (_index: number) => void;
  onImageClick: (_index: number) => void;
}

export function ListingPageImages({
  images,
  imageAltTitle,
  currentImageIndex,
  setCurrentImageIndex,
  imageErrors,
  onImageError,
  onImageClick,
}: ListingPageImagesProps) {
  const { t } = useTranslation();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const horizontalSwipeRef = useRef(false);
  const suppressPreviewClickRef = useRef(false);
  const resetToFirstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewindIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearResetToFirstTimer = useCallback(() => {
    if (resetToFirstTimerRef.current) {
      clearTimeout(resetToFirstTimerRef.current);
      resetToFirstTimerRef.current = null;
    }
    if (rewindIntervalRef.current) {
      clearInterval(rewindIntervalRef.current);
      rewindIntervalRef.current = null;
    }
  }, []);

  useEffect(() => () => clearResetToFirstTimer(), [clearResetToFirstTimer]);

  const handlePreviewMouseLeave = useCallback(() => {
    clearResetToFirstTimer();
    if (images.length <= 1 || currentImageIndex === 0) return;
    resetToFirstTimerRef.current = setTimeout(() => {
      resetToFirstTimerRef.current = null;
      rewindIntervalRef.current = setInterval(() => {
        setCurrentImageIndex((prev) => {
          if (prev <= 0) {
            if (rewindIntervalRef.current) {
              clearInterval(rewindIntervalRef.current);
              rewindIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, REWIND_STEP_MS);
    }, RESET_TO_FIRST_DELAY_MS);
  }, [images.length, currentImageIndex, setCurrentImageIndex, clearResetToFirstTimer]);

  const handlePreviewMouseEnter = useCallback(() => {
    clearResetToFirstTimer();
  }, [clearResetToFirstTimer]);

  const handlePrev = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      clearResetToFirstTimer();
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    },
    [images.length, setCurrentImageIndex, clearResetToFirstTimer],
  );

  const handleNext = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      clearResetToFirstTimer();
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    },
    [images.length, setCurrentImageIndex, clearResetToFirstTimer],
  );

  const { showMainImageLoader, handleImageLoad } = useListingImages({
    images,
    currentImageIndex,
    imageErrors,
  });

  const [animState, setAnimState] = useState<{
    fromIndex: number;
    toIndex: number;
    direction: 'next' | 'prev';
    phase: 'setup' | 'running';
  } | null>(null);
  const prevImgIndexRef = useRef(currentImageIndex);
  const imgRafRef = useRef<number | undefined>(undefined);
  const imgTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useLayoutEffect(() => {
    const from = prevImgIndexRef.current;
    const to = currentImageIndex;
    if (from === to) return;
    prevImgIndexRef.current = to;

    const len = images.length;
    const isNext = to - from === 1 || (from === len - 1 && to === 0);
    const dir: 'next' | 'prev' = isNext ? 'next' : 'prev';

    if (imgRafRef.current !== undefined) cancelAnimationFrame(imgRafRef.current);
    if (imgTimerRef.current !== undefined) clearTimeout(imgTimerRef.current);

    setAnimState({ fromIndex: from, toIndex: to, direction: dir, phase: 'setup' });

    imgRafRef.current = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimState((s) => (s ? { ...s, phase: 'running' } : null));
        imgTimerRef.current = setTimeout(() => {
          setAnimState(null);
        }, IMAGE_SLIDE_DURATION_MS + 30);
      });
    });
  }, [currentImageIndex, images.length]);

  useEffect(
    () => () => {
      if (imgRafRef.current !== undefined) cancelAnimationFrame(imgRafRef.current);
      if (imgTimerRef.current !== undefined) clearTimeout(imgTimerRef.current);
    },
    [],
  );

  const minSwipeDistance = 50;
  const swipeIntentThreshold = 12;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchEndX.current = null;
    touchEndY.current = null;
    horizontalSwipeRef.current = false;
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const nextX = e.targetTouches[0].clientX;
    const nextY = e.targetTouches[0].clientY;
    touchEndX.current = nextX;
    touchEndY.current = nextY;

    if (touchStartX.current === null || touchStartY.current === null) return;

    const deltaX = nextX - touchStartX.current;
    const deltaY = nextY - touchStartY.current;
    const isHorizontalIntent =
      Math.abs(deltaX) > swipeIntentThreshold && Math.abs(deltaX) > Math.abs(deltaY);

    if (isHorizontalIntent) {
      horizontalSwipeRef.current = true;
      e.preventDefault();
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    const resetTouchState = () => {
      horizontalSwipeRef.current = false;
      touchStartX.current = null;
      touchStartY.current = null;
      touchEndX.current = null;
      touchEndY.current = null;
    };

    if (touchStartX.current === null || touchEndX.current === null || !horizontalSwipeRef.current) {
      resetTouchState();
      return;
    }

    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && images.length > 1) {
      suppressPreviewClickRef.current = true;
      clearResetToFirstTimer();
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
    if (isRightSwipe && images.length > 1) {
      suppressPreviewClickRef.current = true;
      clearResetToFirstTimer();
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }

    resetTouchState();
  }, [images.length, setCurrentImageIndex, clearResetToFirstTimer]);

  return (
    <div>
      <div
        onClick={() => {
          if (suppressPreviewClickRef.current) {
            suppressPreviewClickRef.current = false;
            return;
          }
          onImageClick(currentImageIndex);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onImageClick(currentImageIndex);
          }
        }}
        className="relative h-64 sm:h-80 md:h-96 bg-bg-darker rounded-xl overflow-hidden mb-4 w-full cursor-pointer border border-transparent hover-only:hover:border-primary-500/50 transition-colors group touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseLeave={handlePreviewMouseLeave}
        onMouseEnter={handlePreviewMouseEnter}
      >
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-14 h-14 flex justify-start items-center z-10 touch-manipulation lg:w-10 lg:h-10 lg:justify-center"
              aria-label={t('listings.previousPhoto')}
            >
              <span className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center transition-all shadow-lg text-white opacity-60 lg:opacity-0 lg:group-hover:opacity-60 hover-only:hover:opacity-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </span>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-14 h-14 flex justify-end items-center z-10 touch-manipulation lg:w-10 lg:h-10 lg:justify-center"
              aria-label={t('listings.nextPhoto')}
            >
              <span className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center transition-all shadow-lg text-white opacity-60 lg:opacity-0 lg:group-hover:opacity-60 hover-only:hover:opacity-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            </button>
          </>
        )}
        {showMainImageLoader && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Spinner size="lg" />
          </div>
        )}

        {renderPreviewSlides({
          animState,
          currentImageIndex,
          images,
          imageErrors,
          imageAltTitle,
          showMainImageLoader,
          handleImageLoad,
          onImageError,
          t,
        })}
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.slice(0, 4).map((img, index) => {
            const isLastThumbnailMobile = index === 2;
            const isLastThumbnailDesktop = index === 3;
            const hasMoreImagesMobile = images.length > 3;
            const hasMoreImagesDesktop = images.length > 4;
            const remainingCountMobile = images.length - 3;
            const remainingCountDesktop = images.length - 4;

            return (
              <div
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setCurrentImageIndex(index);
                  }
                }}
                className={`relative h-28 sm:h-32 bg-bg-darker rounded-lg overflow-hidden transition-all cursor-pointer ${
                  index === 3 ? 'hidden sm:block' : ''
                } ${
                  currentImageIndex === index
                    ? 'ring-2 ring-primary-500 shadow-md'
                    : 'hover-only:hover:ring-2 hover-only:hover:ring-primary-300'
                }`}
              >
                {img !== '/placeholder-car.jpg' && !imageErrors.has(index) ? (
                  (() => {
                    const optimizedUrl = getOptimizedImageUrl(img, 75, 1200);
                    const isExternal =
                      optimizedUrl.startsWith('http://') || optimizedUrl.startsWith('https://');
                    return (
                      <>
                        <Image
                          src={optimizedUrl}
                          alt={t('listings.imageAltWithTotal', {
                            title: imageAltTitle,
                            index: (index + 1).toString(),
                            total: images.length.toString(),
                          })}
                          fill
                          sizes="(max-width: 640px) 33vw, 25vw"
                          className="object-cover"
                          loading="lazy"
                          draggable={false}
                          unoptimized={isExternal}
                          onLoad={() => handleImageLoad(index)}
                          onError={() => onImageError(index)}
                        />
                        {isLastThumbnailMobile && hasMoreImagesMobile && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex(index);
                              onImageClick(index);
                            }}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center sm:hidden cursor-pointer hover-only:hover:bg-black/70 transition-opacity"
                          >
                            <span className="text-white text-lg font-bold">
                              +{remainingCountMobile}
                            </span>
                          </button>
                        )}
                        {isLastThumbnailDesktop && hasMoreImagesDesktop && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex(index);
                              onImageClick(index);
                            }}
                            className="absolute inset-0 bg-black/60 hidden sm:flex items-center justify-center cursor-pointer hover-only:hover:bg-black/70 transition-opacity"
                          >
                            <span className="text-white text-lg sm:text-xl font-bold">
                              +{remainingCountDesktop}
                            </span>
                          </button>
                        )}
                      </>
                    );
                  })()
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ color: 'rgb(var(--text-secondary-rgb))' }}
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            );
          })}
        </div>
      )}
    </div>
  );
}
