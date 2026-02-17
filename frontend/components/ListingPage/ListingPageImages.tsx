'use client';

import Image from 'next/image';
import { useRef } from 'react';

import { useListingImages } from '@/hooks/useListingImages';
import { useTranslation } from '@/hooks/useTranslation';
import { getOptimizedImageUrl } from '@/lib/utils';
import { Spinner } from '@/ui';

interface ListingPageImagesProps {
  images: string[];
  imageAltTitle: string;
  currentImageIndex: number;
  setCurrentImageIndex: (_index: number) => void;
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
  const touchEndX = useRef<number | null>(null);

  const { showMainImageLoader, handleImageLoad } = useListingImages({
    images,
    currentImageIndex,
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
      setCurrentImageIndex((currentImageIndex + 1) % images.length);
    }
    if (isRightSwipe && images.length > 1) {
      setCurrentImageIndex((currentImageIndex - 1 + images.length) % images.length);
    }
  };

  const currentImage = images[currentImageIndex];
  const hasValidImage =
    currentImage && currentImage !== '/placeholder-car.jpg' && !imageErrors.has(currentImageIndex);

  return (
    <div>
      <div
        onClick={() => onImageClick(currentImageIndex)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onImageClick(currentImageIndex);
          }
        }}
        className="relative h-64 sm:h-80 md:h-96 bg-bg-darker rounded-xl overflow-hidden mb-4 w-full cursor-pointer border border-transparent hover:border-primary-500/50 transition-colors"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {showMainImageLoader && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Spinner size="lg" />
          </div>
        )}

        {hasValidImage ? (
          (() => {
            const optimizedUrl = getOptimizedImageUrl(currentImage, 75, 1200);
            const isExternal =
              optimizedUrl.startsWith('http://') || optimizedUrl.startsWith('https://');
            return (
              <Image
                src={optimizedUrl}
                alt={t('listings.imageAltWithTotal', {
                  title: imageAltTitle,
                  index: (currentImageIndex + 1).toString(),
                  total: images.length.toString(),
                })}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 65vw"
                className={`object-cover ${showMainImageLoader ? 'opacity-0' : 'opacity-100 transition-opacity duration-200'}`}
                priority
                draggable={false}
                unoptimized={isExternal}
                onLoad={() => handleImageLoad(currentImageIndex)}
                onError={() => onImageError(currentImageIndex)}
                data-index={currentImageIndex}
              />
            );
          })()
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ color: 'rgb(var(--text-secondary-rgb))' }}
          >
            <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    : 'hover:ring-2 hover:ring-primary-300'
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
                            className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center sm:hidden cursor-pointer hover:bg-opacity-70 transition-opacity"
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
                            className="absolute inset-0 bg-black bg-opacity-60 hidden sm:flex items-center justify-center cursor-pointer hover:bg-opacity-70 transition-opacity"
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
