'use client';

import Image from 'next/image';

import { Spinner } from '@/ui';

import {
  useListingPageImageModal,
  type ListingPageImageModalProps,
} from './useListingPageImageModal';

export type { ListingPageImageModalProps };

export function ListingPageImageModal(props: ListingPageImageModalProps) {
  const state = useListingPageImageModal(props);

  if (!state.isOpen) return null;

  const {
    swipeContainerRef,
    zoom,
    isMobileViewport,
    swipeHandledRef,
    modalImageLoadedRef,
    setModalImageLoading,
    setVisibleIndex,
    onClose,
    onNext,
    onPrev,
    onImageError,
    images,
    confirmedUrl,
    pendingUrl,
    hasValidImage,
    shouldShowLoader,
    imageAltText,
    isExternalUrl,
    visibleIndex,
    currentIndex,
  } = state;

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
                  transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
                  transformOrigin: '0 0',
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
