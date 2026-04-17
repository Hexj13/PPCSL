'use client';

import { useCallback } from 'react';

import { LISTING_IMAGE_SCHEDULED_RETRY_COUNT, useImageRetry } from '@/hooks/useImageRetry';
import { reportImageLoadFailure } from '@/lib/image-failure-monitor';

export function useListingCardImageError(
  listingId: string,
  images: string[],
  imageErrors: Set<number>,
  setImageErrors: React.Dispatch<React.SetStateAction<Set<number>>>,
) {
  const onFinalFailure = useCallback(
    (index: number) => {
      void reportImageLoadFailure({
        scope: 'listing_card',
        listingId,
        imageUrl: images[index] ?? '',
        imageIndex: index,
        imagesTotal: images.length,
        attemptsMade: LISTING_IMAGE_SCHEDULED_RETRY_COUNT,
      });
    },
    [listingId, images],
  );

  const { onImageError } = useImageRetry(
    images,
    imageErrors,
    setImageErrors,
    65,
    800,
    onFinalFailure,
  );
  return onImageError;
}
