'use client';

import Image from 'next/image';
import { type CSSProperties, type Dispatch, type SetStateAction } from 'react';

import { getOptimizedImageUrl } from '@/lib/utils';

export const RESET_TO_FIRST_DELAY_MS = 10000;
export const REWIND_STEP_MS = 220;
export const IMAGE_SLIDE_DURATION_MS = 220;

const PREVIEW_IMAGE_QUALITY = 75;
const PREVIEW_IMAGE_WIDTH = 1200;

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

type SlideParams = {
  images: string[];
  imageErrors: Set<number>;
  imageAltTitle: string;
  handleImageLoad: (_idx: number) => void;
  onImageError: (_idx: number) => void;
  blurDataURLForIndex: (_index: number) => string | undefined;
  heroPreviewBlurConsumed: boolean;
  t: (_key: string, _params?: Record<string, string>) => string;
};

function renderPreviewImage(index: number, params: SlideParams) {
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

  const optimizedUrl = getOptimizedImageUrl(src, PREVIEW_IMAGE_QUALITY, PREVIEW_IMAGE_WIDTH);
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
      loading={index === 0 ? 'eager' : 'lazy'}
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

function renderPreviewNativeSlide(index: number, params: SlideParams) {
  const { images, imageErrors, imageAltTitle, handleImageLoad, onImageError, t } = params;
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

  const imageUrl =
    src === '/placeholder-car.jpg'
      ? src
      : getOptimizedImageUrl(src, PREVIEW_IMAGE_QUALITY, PREVIEW_IMAGE_WIDTH);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={`preview-native-${index}`}
      src={imageUrl}
      alt={t('listings.imageAltWithTotal', {
        title: imageAltTitle,
        index: String(index + 1),
        total: String(images.length),
      })}
      decoding="sync"
      draggable={false}
      onLoad={() => handleImageLoad(index)}
      onError={() => onImageError(index)}
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

function renderPreviewIncomingSlide(toIndex: number, params: SlideParams) {
  if (toIndex === 0 && !params.heroPreviewBlurConsumed) {
    return renderPreviewImage(0, params);
  }
  return renderPreviewNativeSlide(toIndex, params);
}

function renderPreviewIdleSlide(index: number, params: SlideParams) {
  if (index === 0) {
    return renderPreviewImage(0, params);
  }
  return renderPreviewNativeSlide(index, params);
}

const slideBase: CSSProperties = {
  position: 'absolute',
  inset: 0,
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
};

export function renderPreviewSlides(params: {
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
  onSlideTransformTransitionEnd?: () => void;
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
    onSlideTransformTransitionEnd,
  } = params;

  const slideParams: SlideParams = {
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
        {renderPreviewIdleSlide(currentImageIndex, slideParams)}
      </div>
    );
  }

  const { fromIndex, toIndex, direction, phase } = animState;
  const isRunning = phase === 'running';
  const transitionStyle = isRunning ? `transform ${IMAGE_SLIDE_DURATION_MS}ms ease-out` : 'none';
  const enterOffset = direction === 'next' ? '100%' : '-100%';
  const leaveTarget = direction === 'next' ? '-100%' : '100%';

  const layerStyle = (transform: string): CSSProperties => ({
    ...slideBase,
    transform,
    transition: transitionStyle,
    willChange: isRunning ? 'transform' : 'auto',
  });

  const outgoingContent =
    fromIndex === 0
      ? renderPreviewImage(0, slideParams)
      : renderPreviewNativeSlide(fromIndex, slideParams);
  const incomingContent = renderPreviewIncomingSlide(toIndex, slideParams);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ isolation: 'isolate' }}
      onTransitionEnd={(e) => {
        if (e.propertyName !== 'transform') return;
        if (!isRunning) return;
        onSlideTransformTransitionEnd?.();
      }}
    >
      <div
        style={layerStyle(
          isRunning ? `translate3d(${leaveTarget}, 0, 0)` : 'translate3d(0%, 0, 0)',
        )}
      >
        {outgoingContent}
      </div>
      <div
        style={layerStyle(
          isRunning ? 'translate3d(0%, 0, 0)' : `translate3d(${enterOffset}, 0, 0)`,
        )}
      >
        {incomingContent}
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

export function ListingThumbnailTile({
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

  const optimizedUrl = getOptimizedImageUrl(img, PREVIEW_IMAGE_QUALITY, PREVIEW_IMAGE_WIDTH);
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
