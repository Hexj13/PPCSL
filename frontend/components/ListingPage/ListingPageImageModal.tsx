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
  const modalImageLoadedRef = useRef<Set<number>>(new Set());
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const { visible: showModalImageLoader } = useLoadingState({
    isLoading: modalImageLoading,
    minDisplayTime: 1000,
  });

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && images.length > 1) {
      onNext();
    }
    if (isRightSwipe && images.length > 1) {
      onPrev();
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
      return;
    }

    if (modalImageLoadedRef.current.has(currentIndex)) {
      setModalImageLoading(false);
      return;
    }

    const optimizedUrl = getOptimizedImageUrl(currentImage, 85, 1920);
    const testImg = new window.Image();
    testImg.src = optimizedUrl;
    const imgIndex = currentIndex;

    if (testImg.complete && testImg.naturalWidth > 0) {
      modalImageLoadedRef.current.add(imgIndex);
      setModalImageLoading(false);
      return;
    }

    setModalImageLoading(true);

    testImg.onload = () => {
      modalImageLoadedRef.current.add(imgIndex);
      if (imgIndex === currentIndex) {
        setModalImageLoading(false);
      }
    };

    testImg.onerror = () => {
      if (imgIndex === currentIndex) {
        setModalImageLoading(false);
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
    const nextImageUrl = images[nextIndex];

    if (!nextImageUrl || nextImageUrl === '/placeholder-car.jpg' || imageErrors.has(nextIndex)) {
      return;
    }

    const optimizedUrl = getOptimizedImageUrl(nextImageUrl, 85, 1920);
    const img = new window.Image();
    img.src = optimizedUrl;
  }, [currentIndex, isOpen, images, imageErrors]);

  if (!isOpen) return null;

  const currentImage = images[currentIndex];
  const hasValidImage =
    currentImage && currentImage !== '/placeholder-car.jpg' && !imageErrors.has(currentIndex);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-2 right-2 sm:top-4 sm:right-4 text-primary-400 hover:text-primary-300 transition-colors z-10 p-2"
      >
        <svg
          className="w-6 h-6 sm:w-8 sm:h-8"
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
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-300 transition-all z-10 bg-black/70 hover:bg-black/90 rounded-full p-3 sm:p-4 border-2 border-primary-500/50 hover:border-primary-400 shadow-lg hidden sm:block"
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
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-300 transition-all z-10 bg-black/70 hover:bg-black/90 rounded-full p-3 sm:p-4 border-2 border-primary-500/50 hover:border-primary-400 shadow-lg hidden sm:block"
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
        className="relative max-w-7xl w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {showModalImageLoader && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Spinner size="lg" />
          </div>
        )}

        {hasValidImage ? (
          (() => {
            const optimizedUrl = getOptimizedImageUrl(currentImage, 85, 1920);
            const isExternal =
              optimizedUrl.startsWith('http://') || optimizedUrl.startsWith('https://');
            return isExternal ? (
              <img
                src={optimizedUrl}
                alt={t('listings.imageAltWithTotal', {
                  title: imageAltTitle,
                  index: (currentIndex + 1).toString(),
                  total: images.length.toString(),
                })}
                className={`max-w-full max-h-[90vh] w-auto h-auto object-contain ${showModalImageLoader ? 'opacity-0' : 'opacity-100 transition-opacity duration-200'}`}
                draggable={false}
                onLoad={() => {
                  modalImageLoadedRef.current.add(currentIndex);
                  setModalImageLoading(false);
                }}
                onError={() => {
                  onIndexChange(currentIndex);
                  setModalImageLoading(false);
                }}
                data-index={currentIndex}
              />
            ) : (
              <Image
                src={optimizedUrl}
                alt={t('listings.imageAltWithTotal', {
                  title: imageAltTitle,
                  index: (currentIndex + 1).toString(),
                  total: images.length.toString(),
                })}
                width={1200}
                height={900}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 95vw, 90vw"
                className={`max-w-full max-h-[90vh] w-auto h-auto object-contain ${showModalImageLoader ? 'opacity-0' : 'opacity-100 transition-opacity duration-200'}`}
                priority={currentIndex === 0}
                draggable={false}
                onLoad={() => {
                  modalImageLoadedRef.current.add(currentIndex);
                  setModalImageLoading(false);
                }}
                onError={() => {
                  onIndexChange(currentIndex);
                  setModalImageLoading(false);
                }}
                data-index={currentIndex}
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
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-primary-400 text-lg sm:text-xl font-semibold bg-black bg-opacity-50 px-4 py-2 rounded-full">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
}
