'use client';

import Image from 'next/image';
import { type CSSProperties, type Dispatch, type SetStateAction } from 'react';

import { getOptimizedImageUrl } from '@/lib/utils';

export const RESET_TO_FIRST_DELAY_MS = 10000;
export const REWIND_STEP_MS = 220;

const PREVIEW_IMAGE_QUALITY = 75;
const PREVIEW_IMAGE_WIDTH = 1200;

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

type PreviewSlideOptions = {
  useBlur?: boolean;
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
  } = params;
  const { useBlur = false } = options;
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
  const blurDataURL = useBlur && !heroPreviewBlurConsumed ? blurDataURLForIndex(index) : undefined;
  const priority = index === 0;

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
      loading={priority ? undefined : 'eager'}
      priority={priority}
      placeholder={blurDataURL ? 'blur' : undefined}
      blurDataURL={blurDataURL}
      draggable={false}
      unoptimized={isExternal}
      onLoad={() => handleImageLoad(index)}
      onError={() => onImageError(index)}
    />
  );
}

function renderPreviewIncomingSlide(toIndex: number, params: SlideParams) {
  return renderPreviewSlide(toIndex, params, { useBlur: toIndex === 0 });
}

function renderPreviewIdleSlide(index: number, params: SlideParams) {
  return renderPreviewSlide(index, params, { useBlur: index === 0 });
}

const slideBase: CSSProperties = {
  position: 'absolute',
  inset: 0,
};

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
  };

  const renderLayer = (slotId: HeroPreviewSlotId) => {
    const index = slotIndices[slotId];
    if (index === null) {
      return null;
    }

    const isConfirmed = slotId === confirmedSlot;
    const isPending = slotId === pendingSlot;
    const content =
      isPending && index !== 0
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
        style={{
          ...slideBase,
          opacity: isConfirmed ? 1 : 0,
          visibility: isConfirmed ? 'visible' : 'hidden',
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
  handleThumbnailImageLoad: (_idx: number) => void;
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
  handleThumbnailImageLoad,
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
        onLoad={() => handleThumbnailImageLoad(index)}
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
