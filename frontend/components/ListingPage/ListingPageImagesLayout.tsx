'use client';

import { type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import { Spinner } from '@/ui';

import { ListingThumbnailTile, renderPreviewSlides } from './ListingPageImagesPreview';

export type ListingPageImagesLayoutProps = {
  visibleIndex: number;
  images: string[];
  imageErrors: Set<number>;
  suppressPreviewClickRef: MutableRefObject<boolean>;
  onImageClick: (_index: number) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  handlePreviewMouseLeave: () => void;
  handlePreviewMouseEnter: () => void;
  navBusy: boolean;
  handlePrev: (e: React.MouseEvent) => void;
  handleNext: (e: React.MouseEvent) => void;
  t: (_key: string, _params?: Record<string, string>) => string;
  showMainImageLoader: boolean;
  animState: {
    fromIndex: number;
    toIndex: number;
    direction: 'next' | 'prev';
    phase: 'setup' | 'running';
  } | null;
  imageAltTitle: string;
  handlePreviewImageLoad: (_idx: number) => void;
  onImageError: (_idx: number) => void;
  blurDataURLForIndex: (_index: number) => string | undefined;
  heroPreviewBlurConsumed: boolean;
  navigateTo: (_index: number, _options?: { clearTimer?: boolean }) => void;
  setCurrentImageIndex: Dispatch<SetStateAction<number>>;
  handleImageLoad: (_idx: number) => void;
  onSlideTransformTransitionEnd: () => void;
};

export function ListingPageImagesLayout({
  visibleIndex,
  images,
  imageErrors,
  suppressPreviewClickRef,
  onImageClick,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  handlePreviewMouseLeave,
  handlePreviewMouseEnter,
  navBusy,
  handlePrev,
  handleNext,
  t,
  showMainImageLoader,
  animState,
  imageAltTitle,
  handlePreviewImageLoad,
  onImageError,
  blurDataURLForIndex,
  heroPreviewBlurConsumed,
  navigateTo,
  setCurrentImageIndex,
  handleImageLoad,
  onSlideTransformTransitionEnd,
}: ListingPageImagesLayoutProps) {
  return (
    <div>
      <div
        onClick={() => {
          if (suppressPreviewClickRef.current) {
            suppressPreviewClickRef.current = false;
            return;
          }
          onImageClick(visibleIndex);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onImageClick(visibleIndex);
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
              aria-disabled={navBusy}
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
              aria-disabled={navBusy}
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
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <Spinner size="lg" />
          </div>
        )}

        {renderPreviewSlides({
          animState,
          currentImageIndex: visibleIndex,
          images,
          imageErrors,
          imageAltTitle,
          handleImageLoad: handlePreviewImageLoad,
          onImageError,
          blurDataURLForIndex,
          heroPreviewBlurConsumed,
          t,
          onSlideTransformTransitionEnd,
        })}
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.slice(0, 4).map((img, index) => (
            <div
              key={index}
              onClick={() => navigateTo(index, { clearTimer: true })}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigateTo(index, { clearTimer: true });
                }
              }}
              className={`relative h-28 sm:h-32 bg-bg-darker rounded-lg overflow-hidden transition-all cursor-pointer ${
                index === 3 ? 'hidden sm:block' : ''
              } ${
                visibleIndex === index
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
