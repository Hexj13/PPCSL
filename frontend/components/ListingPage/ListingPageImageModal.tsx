'use client';

import { useEffect, useRef } from 'react';

import { isListingPageVideoHeroSlideUrl } from '@/app/listings/[id]/listing-page-helpers';
import { TrackedNextImage } from '@/components/common/TrackedNextImage';
import { ListingPhotoCarouselNavButtons } from '@/components/listing/ListingPhotoCarouselNavButtons';
import { useTranslation } from '@/hooks/useTranslation';
import { getOptimizedImageUrl } from '@/lib/utils';

import {
  useListingPageImageModal,
  type ListingPageImageModalProps,
} from './useListingPageImageModal';

export type { ListingPageImageModalProps };

const THUMB_QUALITY = 68;
const THUMB_WIDTH = 160;

const EMPTY_WEBVTT_DATA_URL = 'data:text/vtt;charset=utf-8,' + encodeURIComponent('WEBVTT\n\n');

export function ListingPageImageModal(props: ListingPageImageModalProps) {
  const { t } = useTranslation();
  const thumbStripRef = useRef<HTMLDivElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const state = useListingPageImageModal(props);

  useEffect(() => {
    if (!state.isOpen || props.images.length < 5) return;
    const strip = thumbStripRef.current;
    if (!strip) return;
    const active = strip.querySelector<HTMLElement>(`[data-thumb-index="${state.visibleIndex}"]`);
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [props.images.length, state.isOpen, state.visibleIndex]);

  useEffect(() => {
    if (!state.isOpen || !state.isVideoSlideActive || !props.listingVideoSlide) {
      return;
    }
    const el = modalVideoRef.current;
    if (!el) {
      return;
    }
    const id = window.requestAnimationFrame(() => {
      void el.play().catch(() => {});
    });
    return () => {
      window.cancelAnimationFrame(id);
      el.pause();
    };
  }, [state.isOpen, state.isVideoSlideActive, props.listingVideoSlide]);

  if (!state.isOpen) return null;

  const {
    swipeContainerRef,
    zoom,
    isMobileViewport,
    modalImageLoadedRef,
    setVisibleIndex,
    onClose,
    onNext,
    onPrev,
    onImageError,
    images,
    confirmedUrl,
    pendingUrl,
    hasValidImage,
    isVideoSlideActive,
    imageAltText,
    isExternalUrl,
    visibleIndex,
    currentIndex,
    getBlurDataURL,
  } = state;

  const confirmedBlur = getBlurDataURL(visibleIndex);
  const pendingBlur =
    pendingUrl && pendingUrl !== confirmedUrl ? getBlurDataURL(currentIndex) : undefined;

  return (
    <div
      className="group fixed inset-0 bg-black z-50 flex items-center justify-center p-4"
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
        if (target.closest('button, img, video')) return;
        if (state.swipeHandledRef.current) {
          state.swipeHandledRef.current = false;
          return;
        }
        onClose();
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 text-primary-500 hover-only:hover:text-primary-700 transition-colors z-10 p-2"
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
        <ListingPhotoCarouselNavButtons
          variant="modal"
          onPrev={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          onNext={(e) => {
            e.stopPropagation();
            onNext();
          }}
          prevLabel={t('listings.previousPhoto')}
          nextLabel={t('listings.nextPhoto')}
        />
      )}

      <div
        ref={swipeContainerRef}
        className="relative max-w-7xl w-full h-full flex flex-col items-center justify-center p-4 min-h-0"
      >
        <div
          className="relative w-full flex-1 min-h-0 flex items-center justify-center"
          style={
            isMobileViewport && !isVideoSlideActive
              ? {
                  transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
                  transformOrigin: '0 0',
                }
              : undefined
          }
        >
          {hasValidImage ? (
            <>
              {isVideoSlideActive && props.listingVideoSlide ? (
                <video
                  ref={modalVideoRef}
                  key="listing-slide-video"
                  controls
                  playsInline
                  className="relative z-[1] m-auto max-h-[90vh] max-w-full rounded-lg"
                  poster={props.listingVideoSlide.posterUrl ?? undefined}
                >
                  {props.listingVideoSlide.webmUrl ? (
                    <source src={props.listingVideoSlide.webmUrl} type="video/webm" />
                  ) : null}
                  <source src={props.listingVideoSlide.mp4Url} type="video/mp4" />
                  <track
                    kind="captions"
                    src={EMPTY_WEBVTT_DATA_URL}
                    srcLang="und"
                    label={t('listingDetail.video.captionsTrackLabel')}
                    default
                  />
                </video>
              ) : (
                <>
                  {confirmedUrl && (
                    <TrackedNextImage
                      key={`confirmed-${visibleIndex}`}
                      src={confirmedUrl}
                      alt={imageAltText}
                      width={1200}
                      height={900}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 95vw, 90vw"
                      className="absolute inset-0 m-auto max-w-full max-h-[90vh] w-auto h-auto object-contain opacity-100 transition-opacity duration-200"
                      loading="eager"
                      draggable={false}
                      unoptimized={isExternalUrl(confirmedUrl)}
                      placeholder={confirmedBlur ? 'blur' : undefined}
                      blurDataURL={confirmedBlur}
                      onLoad={() => {
                        modalImageLoadedRef.current.add(confirmedUrl);
                      }}
                      onError={() => {
                        onImageError(visibleIndex);
                      }}
                      data-layer="confirmed"
                    />
                  )}
                  {pendingUrl && pendingUrl !== confirmedUrl && (
                    <TrackedNextImage
                      key={`pending-${currentIndex}`}
                      src={pendingUrl}
                      alt={imageAltText}
                      width={1200}
                      height={900}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 95vw, 90vw"
                      className="absolute inset-0 m-auto max-w-full max-h-[90vh] w-auto h-auto object-contain opacity-0 transition-opacity duration-200 pointer-events-none"
                      loading="eager"
                      draggable={false}
                      unoptimized={isExternalUrl(pendingUrl)}
                      placeholder={pendingBlur ? 'blur' : undefined}
                      blurDataURL={pendingBlur}
                      onLoad={() => {
                        modalImageLoadedRef.current.add(pendingUrl);
                        setVisibleIndex(currentIndex);
                      }}
                      onError={() => {
                        onImageError(currentIndex);
                        setVisibleIndex(currentIndex);
                      }}
                      data-layer="pending"
                    />
                  )}
                </>
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

        {images.length >= 5 && (
          <div
            ref={thumbStripRef}
            className="hidden sm:block w-full max-w-full shrink-0 mt-2 px-2 pb-0.5 overflow-x-auto overscroll-x-contain z-10"
          >
            <div className="flex gap-2 justify-center items-center w-max max-w-none mx-auto">
              {images.map((src, index) => {
                if (!src || src === '/placeholder-car.jpg' || props.imageErrors.has(index)) {
                  return null;
                }
                const active = index === visibleIndex;
                const isVideoHeroThumb =
                  index === 0 && props.listingVideoSlide && isListingPageVideoHeroSlideUrl(src);
                const thumbBlur = getBlurDataURL(index);
                const thumbUrl = isVideoHeroThumb
                  ? ''
                  : getOptimizedImageUrl(src, THUMB_QUALITY, THUMB_WIDTH);
                return (
                  <button
                    key={`modal-thumb-${index}`}
                    type="button"
                    data-thumb-index={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onIndexChange(index);
                    }}
                    className={`relative shrink-0 w-16 h-12 rounded-md overflow-hidden border-2 transition-colors ${
                      active
                        ? 'border-primary-500 ring-2 ring-primary-500/40'
                        : 'border-primary-900/50 hover-only:border-primary-500/70'
                    }`}
                  >
                    {isVideoHeroThumb && props.listingVideoSlide ? (
                      <video
                        className="absolute inset-0 h-full w-full object-cover"
                        src={props.listingVideoSlide.mp4Url}
                        muted
                        playsInline
                        preload="metadata"
                        poster={props.listingVideoSlide.posterUrl ?? undefined}
                        aria-hidden
                      />
                    ) : (
                      <TrackedNextImage
                        src={thumbUrl}
                        alt={t('listings.modalThumbnailAlt', {
                          index: String(index + 1),
                          total: String(images.length),
                        })}
                        fill
                        sizes="64px"
                        className="object-cover"
                        draggable={false}
                        unoptimized={
                          thumbUrl.startsWith('http://') || thumbUrl.startsWith('https://')
                        }
                        placeholder={thumbBlur ? 'blur' : undefined}
                        blurDataURL={thumbBlur}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {images.length > 1 && (
          <div className="mt-1.5 sm:mt-2 text-primary-500 text-sm sm:text-base font-semibold bg-primary-900/85 px-2.5 py-1 rounded-full border border-primary-500 shrink-0 leading-tight">
            {visibleIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
}
