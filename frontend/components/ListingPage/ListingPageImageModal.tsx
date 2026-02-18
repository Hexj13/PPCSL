'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { useLoadingState } from '@/hooks/useLoadingState';
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
}

export function ListingPageImageModal({
  isOpen,
  images,
  currentIndex,
  imageAltTitle,
  imageErrors,
  onClose,
  onNext,
  onPrev,
  onIndexChange,
}: ListingPageImageModalProps) {
  const { t } = useTranslation();
  const [modalImageLoading, setModalImageLoading] = useState(false);
  const [visibleIndex, setVisibleIndex] = useState(currentIndex);
  const modalImageLoadedRef = useRef<Set<number>>(new Set());
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const swipeHandledRef = useRef(false);
  const swipeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIsOpenRef = useRef(false);

  const { visible: showModalImageLoader } = useLoadingState({
    isLoading: modalImageLoading,
    minDisplayTime: 1000,
  });

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setVisibleIndex(currentIndex);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, currentIndex]);

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
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
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

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen]);

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

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
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
      modalImageLoadedRef.current.clear();
      return;
    }

    const imagesList = images.length > 0 ? images : ['/placeholder-car.jpg'];
    const currentImage = imagesList[currentIndex];

    if (!currentImage || currentImage === '/placeholder-car.jpg' || imageErrors.has(currentIndex)) {
      setModalImageLoading(false);
      setVisibleIndex(currentIndex);
      return;
    }

    if (modalImageLoadedRef.current.has(currentIndex)) {
      setModalImageLoading(false);
      setVisibleIndex(currentIndex);
      return;
    }

    const optimizedUrl = getOptimizedImageUrl(currentImage, 85, 1920);
    const testImg = new window.Image();
    testImg.src = optimizedUrl;
    const imgIndex = currentIndex;

    if (testImg.complete && testImg.naturalWidth > 0) {
      modalImageLoadedRef.current.add(imgIndex);
      setModalImageLoading(false);
      setVisibleIndex(imgIndex);
      return;
    }

    setModalImageLoading(true);

    testImg.onload = () => {
      modalImageLoadedRef.current.add(imgIndex);
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
  }, [currentIndex, isOpen, images, imageErrors]);

  useEffect(() => {
    if (!isOpen || images.length <= 1) return;

    const nextIndex = (currentIndex + 1) % images.length;
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    const preloadImages: HTMLImageElement[] = [];

    for (const index of [nextIndex, prevIndex]) {
      if (modalImageLoadedRef.current.has(index)) continue;
      const url = images[index];
      if (!url || url === '/placeholder-car.jpg' || imageErrors.has(index)) continue;
      const optimizedUrl = getOptimizedImageUrl(url, 85, 1920);
      const img = new window.Image();
      const capturedIndex = index;
      img.onload = () => {
        modalImageLoadedRef.current.add(capturedIndex);
      };
      img.src = optimizedUrl;
      preloadImages.push(img);
    }

    return () => {
      for (const img of preloadImages) {
        img.onload = null;
      }
    };
  }, [currentIndex, isOpen, images, imageErrors]);

  if (!isOpen) return null;

  const imagesList = images.length > 0 ? images : ['/placeholder-car.jpg'];
  const displayImage = imagesList[visibleIndex];
  const hasValidImage =
    displayImage && displayImage !== '/placeholder-car.jpg' && !imageErrors.has(visibleIndex);
  const isDisplayImageLoading = showModalImageLoader && visibleIndex === currentIndex;

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
        className="absolute top-3 right-3 sm:top-4 sm:right-4 text-primary-700 hover:text-primary-900 transition-colors z-10 p-2"
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
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-primary-900 transition-all duration-200 z-10 bg-primary-500 rounded-full p-3 sm:p-4 border-2 border-primary-900 shadow-lg hidden sm:block hover:scale-110"
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
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-primary-900 transition-all duration-200 z-10 bg-primary-500 rounded-full p-3 sm:p-4 border-2 border-primary-900 shadow-lg hidden sm:block hover:scale-110"
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
        {isDisplayImageLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Spinner size="lg" />
          </div>
        )}

        {hasValidImage ? (
          (() => {
            const optimizedUrl = getOptimizedImageUrl(displayImage, 85, 1920);
            const isExternal =
              optimizedUrl.startsWith('http://') || optimizedUrl.startsWith('https://');
            return (
              <Image
                src={optimizedUrl}
                alt={t('listings.imageAltWithTotal', {
                  title: imageAltTitle,
                  index: (visibleIndex + 1).toString(),
                  total: images.length.toString(),
                })}
                width={1200}
                height={900}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 95vw, 90vw"
                className={`max-w-full max-h-[90vh] w-auto h-auto object-contain ${isDisplayImageLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-200'}`}
                priority={visibleIndex === 0}
                draggable={false}
                unoptimized={isExternal}
                onLoad={() => {
                  modalImageLoadedRef.current.add(visibleIndex);
                  setModalImageLoading(false);
                }}
                onError={() => {
                  onIndexChange(visibleIndex);
                  setModalImageLoading(false);
                }}
                data-index={visibleIndex}
              />
            );
          })()
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

        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-primary-500 text-lg sm:text-xl font-semibold bg-black bg-opacity-50 px-4 py-2 rounded-full">
            {visibleIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
}
