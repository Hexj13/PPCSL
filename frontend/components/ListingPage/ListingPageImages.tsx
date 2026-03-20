'use client';

import Image from 'next/image';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from 'react';

import { useListingImages } from '@/hooks/useListingImages';
import { useTranslation } from '@/hooks/useTranslation';
import { getOptimizedImageUrl } from '@/lib/utils';
import { blurhashToDataURL } from '@/lib/utils/blurhash';
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
    handleImageLoad: (_idx: number) => void;
    onImageError: (_idx: number) => void;
    blurDataURLForIndex: (_index: number) => string | undefined;
    heroPreviewBlurConsumed: boolean;
    t: (_key: string, _params?: Record<string, string>) => string;
  },
) {
  const {
    images,
    imageErrors,
    imageAltTitle,
    handleImageLoad,
    onImageError,
    blurDataURLForIndex,
    heroPreviewBlurConsumed,
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
  const blurDataURL = index === 0 && !heroPreviewBlurConsumed ? blurDataURLForIndex(0) : undefined;

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
      className="object-cover opacity-100"
      loading={index === 0 ? undefined : 'lazy'}
      priority={index === 0}
      placeholder={blurDataURL ? 'blur' : undefined}
      blurDataURL={blurDataURL}
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
  handleImageLoad: (_idx: number) => void;
  onImageError: (_idx: number) => void;
  blurDataURLForIndex: (_index: number) => string | undefined;
  heroPreviewBlurConsumed: boolean;
  t: (_key: string, _params?: Record<string, string>) => string;
}) {
  const {
    animState,
    currentImageIndex,
    images,
    imageErrors,
    imageAltTitle,
    handleImageLoad,
    onImageError,
    blurDataURLForIndex,
    heroPreviewBlurConsumed,
    t,
  } = params;

  const slideParams = {
    images,
    imageErrors,
    imageAltTitle,
    handleImageLoad,
    onImageError,
    blurDataURLForIndex,
    heroPreviewBlurConsumed,
    t,
  };

  if (!animState) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        {renderPreviewImage(currentImageIndex, slideParams)}
      </div>
    );
  }

  const { fromIndex, toIndex, direction, phase } = animState;
  const isRunning = phase === 'running';
  const transitionStyle = isRunning ? `transform ${IMAGE_SLIDE_DURATION_MS}ms ease-out` : 'none';
  const enterOffset = direction === 'next' ? '100%' : '-100%';
  const leaveTarget = direction === 'next' ? '-100%' : '100%';

  const layerStyle = (transform: string): CSSProperties => ({
    position: 'absolute',
    inset: 0,
    transform,
    transition: transitionStyle,
    willChange: isRunning ? 'transform' : 'auto',
  });

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        style={layerStyle(
          isRunning ? `translate3d(${leaveTarget}, 0, 0)` : 'translate3d(0%, 0, 0)',
        )}
      >
        {renderPreviewImage(fromIndex, slideParams)}
      </div>
      <div
        style={layerStyle(
          isRunning ? 'translate3d(0%, 0, 0)' : `translate3d(${enterOffset}, 0, 0)`,
        )}
      >
        {renderPreviewImage(toIndex, slideParams)}
      </div>
    </div>
  );
}

type ListingThumbnailTileProps = {
  img: string;
  index: number;
  totalImages: number;
  imageAltTitle: string;
  blurDataURLForIndex: (_index: number) => string | undefined;
  t: (_key: string, _params?: Record<string, string>) => string;
  handleImageLoad: (_idx: number) => void;
  onImageError: (_idx: number) => void;
  setCurrentImageIndex: Dispatch<SetStateAction<number>>;
  onImageClick: (_index: number) => void;
};

function ListingThumbnailTile({
  img,
  index,
  totalImages,
  imageAltTitle,
  blurDataURLForIndex,
  t,
  handleImageLoad,
  onImageError,
  setCurrentImageIndex,
  onImageClick,
}: ListingThumbnailTileProps) {
  const isLastThumbnailMobile = index === 2;
  const isLastThumbnailDesktop = index === 3;
  const hasMoreImagesMobile = totalImages > 3;
  const hasMoreImagesDesktop = totalImages > 4;
  const remainingCountMobile = totalImages - 3;
  const remainingCountDesktop = totalImages - 4;

  const optimizedUrl = getOptimizedImageUrl(img, 75, 1200);
  const isExternal = optimizedUrl.startsWith('http://') || optimizedUrl.startsWith('https://');
  const thumbBlur = blurDataURLForIndex(index);

  return (
    <>
      <Image
        src={optimizedUrl}
        alt={t('listings.imageAltWithTotal', {
          title: imageAltTitle,
          index: (index + 1).toString(),
          total: totalImages.toString(),
        })}
        fill
        sizes="(max-width: 640px) 33vw, 25vw"
        className="object-cover"
        loading="lazy"
        placeholder={thumbBlur ? 'blur' : undefined}
        blurDataURL={thumbBlur}
        draggable={false}
        unoptimized={isExternal}
        onLoad={() => handleImageLoad(index)}
        onError={() => onImageError(index)}
      />
      {isLastThumbnailMobile && hasMoreImagesMobile && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCurrentImageIndex(index);
            onImageClick(index);
          }}
          className="absolute inset-0 bg-black/60 flex items-center justify-center sm:hidden cursor-pointer hover-only:hover:bg-black/70 transition-opacity"
        >
          <span className="text-white text-lg font-bold">+{remainingCountMobile}</span>
        </button>
      )}
      {isLastThumbnailDesktop && hasMoreImagesDesktop && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCurrentImageIndex(index);
            onImageClick(index);
          }}
          className="absolute inset-0 bg-black/60 hidden sm:flex items-center justify-center cursor-pointer hover-only:hover:bg-black/70 transition-opacity"
        >
          <span className="text-white text-lg sm:text-xl font-bold">+{remainingCountDesktop}</span>
        </button>
      )}
    </>
  );
}

interface ListingPageImagesProps {
  images: string[];
  imageAltTitle: string;
  currentImageIndex: number;
  setCurrentImageIndex: Dispatch<SetStateAction<number>>;
  imageErrors: Set<number>;
  onImageError: (_index: number) => void;
  onImageClick: (_index: number) => void;
  coverBlurHash?: string | null;
  imageBlurHashes?: (string | null)[] | null;
}

export function ListingPageImages({
  images,
  imageAltTitle,
  currentImageIndex,
  setCurrentImageIndex,
  imageErrors,
  onImageError,
  onImageClick,
  coverBlurHash,
  imageBlurHashes,
}: ListingPageImagesProps) {
  const { t } = useTranslation();

  const imagesSignature = useMemo(() => images.join('\u0001'), [images]);
  const [heroPreviewBlurConsumed, setHeroPreviewBlurConsumed] = useState(false);

  useEffect(() => {
    setHeroPreviewBlurConsumed(false);
  }, [imagesSignature]);

  const blurDataURLForIndex = useMemo(() => {
    return (index: number): string | undefined => {
      const fromArr = imageBlurHashes?.[index];
      const hash =
        typeof fromArr === 'string' && fromArr.length > 0
          ? fromArr
          : index === 0 && coverBlurHash && coverBlurHash.length > 0
            ? coverBlurHash
            : undefined;
      if (!hash) return undefined;
      try {
        return blurhashToDataURL(hash);
      } catch {
        return undefined;
      }
    };
  }, [imageBlurHashes, coverBlurHash]);
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

  const handlePreviewImageLoad = useCallback(
    (idx: number) => {
      handleImageLoad(idx);
      if (idx === 0) {
        setHeroPreviewBlurConsumed(true);
      }
    },
    [handleImageLoad],
  );

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
      setAnimState((s) => (s ? { ...s, phase: 'running' } : null));
      imgTimerRef.current = setTimeout(() => {
        setAnimState(null);
      }, IMAGE_SLIDE_DURATION_MS + 30);
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
  const swipeIntentThreshold = 18;

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
      Math.abs(deltaX) > swipeIntentThreshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.1;

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
        className="relative h-64 sm:h-80 md:h-96 bg-bg-darker rounded-xl overflow-hidden mb-4 w-full cursor-pointer border border-transparent hover-only:hover:border-primary-500/50 transition-colors group touch-manipulation"
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
          handleImageLoad: handlePreviewImageLoad,
          onImageError,
          blurDataURLForIndex,
          heroPreviewBlurConsumed,
          t,
        })}
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.slice(0, 4).map((img, index) => (
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
                <ListingThumbnailTile
                  img={img}
                  index={index}
                  totalImages={images.length}
                  imageAltTitle={imageAltTitle}
                  blurDataURLForIndex={blurDataURLForIndex}
                  t={t}
                  handleImageLoad={handleImageLoad}
                  onImageError={onImageError}
                  setCurrentImageIndex={setCurrentImageIndex}
                  onImageClick={onImageClick}
                />
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
          ))}
        </div>
      )}
    </div>
  );
}
