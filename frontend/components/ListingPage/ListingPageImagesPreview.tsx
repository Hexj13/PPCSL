'use client';

import { memo, useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import {
  getListingPagePreviewImageUrl,
  getListingPageThumbImageUrl,
  isListingPageVideoHeroSlideUrl,
} from '@/app/[locale]/listings/[id]/listing-page-helpers';
import { TrackedNextImage } from '@/components/common/TrackedNextImage';

export const RESET_TO_FIRST_DELAY_MS = 10000;
export const REWIND_STEP_MS = 220;
export const VIDEO_POSTER_BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAzMiAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48ZmlsdGVyIGlkPSJiIiB4PSItMjAiIHk9Ii0yMCIgd2lkdGg9IjcyIiBoZWlnaHQ9IjU4IiBjb2xvci1pbnRlcnBvbGF0aW9uLWZpbHRlcnM9InNSR0IiPjxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjgiLz48L2ZpbHRlcj48L2RlZnM+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjE4IiBmaWxsPSIjMDY0ZTM5Ii8+PGNpcmNsZSBjeD0iOSIgY3k9IjYiIHI9IjEwIiBmaWxsPSIjMTg3YjU4IiBmaWx0ZXI9InVybCgjYikiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjEzIiByPSIxMiIgZmlsbD0iIzAyMzUyOSIgb3BhY2l0eT0iLjkiIGZpbHRlcj0idXJsKCNiKSIvPjwvc3ZnPg==';

export type HeroPreviewSlotId = 'primary' | 'secondary';
export type HeroPreviewSlots = Record<HeroPreviewSlotId, number | null>;

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

export type ListingPageHeroVideoSlide = {
  posterUrl: string | null;
  webmUrl?: string | null;
  mp4Url: string;
};

export function ListingPageVideoPreviewFrame({
  videoSlide,
  blurDataURL,
  className,
  videoClassName,
  ariaLabel,
  ariaHidden,
  onLoaded,
  onError,
}: {
  videoSlide: ListingPageHeroVideoSlide;
  blurDataURL?: string;
  className: string;
  videoClassName: string;
  ariaLabel?: string;
  ariaHidden?: boolean;
  onLoaded?: () => void;
  onError?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [videoSlide.mp4Url, videoSlide.webmUrl, videoSlide.posterUrl]);

  const handleLoaded = useCallback(() => {
    setLoaded(true);
    onLoaded?.();
  }, [onLoaded]);

  return (
    <div className={className}>
      <div
        className={`absolute inset-0 scale-105 bg-cover bg-center blur-md transition-opacity duration-300 ${
          loaded ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ backgroundImage: `url(${blurDataURL ?? VIDEO_POSTER_BLUR_DATA_URL})` }}
        aria-hidden
      />
      <video
        className={`absolute inset-0 transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${videoClassName}`}
        muted
        playsInline
        preload="auto"
        poster={videoSlide.posterUrl ?? undefined}
        aria-label={ariaLabel}
        aria-hidden={ariaHidden}
        onLoadedData={handleLoaded}
        onCanPlay={handleLoaded}
        onError={onError}
      >
        {videoSlide.webmUrl ? <source src={videoSlide.webmUrl} type="video/webm" /> : null}
        <source src={videoSlide.mp4Url} type="video/mp4" />
      </video>
    </div>
  );
}

type SlideParams = {
  images: string[];
  imageErrors: Set<number>;
  imageAltTitle: string;
  handleImageLoad: (_idx: number) => void;
  onImageError: (_idx: number) => void;
  blurDataURLForIndex: (_index: number) => string | undefined;
  heroPreviewBlurConsumed: boolean;
  t: (_key: string, _params?: Record<string, string>) => string;
  videoSlide: ListingPageHeroVideoSlide | null;
};

type PreviewSlideOptions = {
  useBlur?: boolean;
  incomingBlur?: boolean;
};

function renderPreviewSlide(index: number, params: SlideParams, options: PreviewSlideOptions = {}) {
  const {
    images,
    imageErrors,
    imageAltTitle,
    handleImageLoad,
    onImageError,
    blurDataURLForIndex,
    heroPreviewBlurConsumed,
    t,
    videoSlide,
  } = params;
  const { useBlur = false, incomingBlur = false } = options;
  const src = images[index];
  const hasError = imageErrors.has(index);

  if (
    index === 0 &&
    videoSlide &&
    src &&
    isListingPageVideoHeroSlideUrl(src) &&
    videoSlide.mp4Url
  ) {
    const videoBlurDataURL = blurDataURLForIndex(index) ?? VIDEO_POSTER_BLUR_DATA_URL;
    return (
      <ListingPageVideoPreviewFrame
        key="listing-hero-video-slide"
        videoSlide={videoSlide}
        blurDataURL={videoBlurDataURL}
        className="absolute inset-0 h-full w-full"
        videoClassName="h-full w-full object-cover"
        aria-label={t('listings.imageAltWithTotal', {
          title: imageAltTitle,
          index: String(index + 1),
          total: String(images.length),
        })}
        onLoaded={() => handleImageLoad(index)}
        onError={() => onImageError(index)}
      />
    );
  }

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

  const optimizedUrl = getListingPagePreviewImageUrl(src);
  const isExternal = optimizedUrl.startsWith('http://') || optimizedUrl.startsWith('https://');
  const isVideoPosterSlide = index === 0 && !!videoSlide;
  const blurDataURL =
    useBlur && (incomingBlur || !heroPreviewBlurConsumed)
      ? isVideoPosterSlide
        ? (blurDataURLForIndex(index) ?? VIDEO_POSTER_BLUR_DATA_URL)
        : blurDataURLForIndex(index)
      : undefined;
  const priority = index === 0;

  return (
    <>
      {blurDataURL ? (
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center blur-md"
          style={{ backgroundImage: `url(${blurDataURL})` }}
          aria-hidden
        />
      ) : null}
      <TrackedNextImage
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
        loading={priority ? undefined : 'eager'}
        priority={priority}
        draggable={false}
        unoptimized={isExternal}
        onLoad={() => handleImageLoad(index)}
        onError={() => onImageError(index)}
      />
    </>
  );
}

function renderPreviewIncomingSlide(toIndex: number, params: SlideParams) {
  return renderPreviewSlide(toIndex, params, { useBlur: true, incomingBlur: true });
}

function renderPreviewIdleSlide(index: number, params: SlideParams) {
  return renderPreviewSlide(index, params, { useBlur: index === 0 });
}

export function renderPreviewSlides(params: {
  confirmedSlot: HeroPreviewSlotId;
  pendingSlot: HeroPreviewSlotId | null;
  slotIndices: HeroPreviewSlots;
  images: string[];
  imageErrors: Set<number>;
  imageAltTitle: string;
  onHeroImageLoad: (_slotId: HeroPreviewSlotId, _idx: number) => void;
  onImageError: (_idx: number) => void;
  blurDataURLForIndex: (_index: number) => string | undefined;
  heroPreviewBlurConsumed: boolean;
  t: (_key: string, _params?: Record<string, string>) => string;
  videoSlide: ListingPageHeroVideoSlide | null;
}) {
  const {
    confirmedSlot,
    pendingSlot,
    slotIndices,
    images,
    imageErrors,
    imageAltTitle,
    onHeroImageLoad,
    onImageError,
    blurDataURLForIndex,
    heroPreviewBlurConsumed,
    t,
    videoSlide,
  } = params;

  const slideParams: SlideParams = {
    images,
    imageErrors,
    imageAltTitle,
    handleImageLoad: () => {},
    onImageError,
    blurDataURLForIndex,
    heroPreviewBlurConsumed,
    t,
    videoSlide,
  };

  const renderLayer = (slotId: HeroPreviewSlotId) => {
    const index = slotIndices[slotId];
    if (index === null) {
      return null;
    }

    const isConfirmed = slotId === confirmedSlot;
    const isPending = slotId === pendingSlot;
    const content = isPending
      ? renderPreviewIncomingSlide(index, {
          ...slideParams,
          handleImageLoad: () => onHeroImageLoad(slotId, index),
        })
      : renderPreviewIdleSlide(index, {
          ...slideParams,
          handleImageLoad: () => onHeroImageLoad(slotId, index),
        });

    return (
      <div
        key={slotId}
        className="absolute inset-0 overflow-hidden"
        style={{
          opacity: isConfirmed ? 1 : 0,
          pointerEvents: isConfirmed ? 'auto' : 'none',
          zIndex: isConfirmed ? 1 : 0,
        }}
      >
        {content}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      {renderLayer('primary')}
      {renderLayer('secondary')}
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
  onImageError: (_idx: number) => void;
  setCurrentImageIndex: Dispatch<SetStateAction<number>>;
  onImageClick: (_index: number) => void;
};

function ListingThumbnailTileComponent({
  img,
  index,
  totalImages,
  imageAltTitle,
  blurDataURLForIndex,
  t,
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

  const optimizedUrl = getListingPageThumbImageUrl(img);
  const isExternal = optimizedUrl.startsWith('http://') || optimizedUrl.startsWith('https://');
  const thumbBlur = blurDataURLForIndex(index);

  return (
    <>
      {thumbBlur ? (
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center blur-md"
          style={{ backgroundImage: `url(${thumbBlur})` }}
          aria-hidden
        />
      ) : null}
      <TrackedNextImage
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
        draggable={false}
        unoptimized={isExternal}
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

export const ListingThumbnailTile = memo(ListingThumbnailTileComponent);
