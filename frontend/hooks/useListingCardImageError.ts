'use client';

import { useCallback } from 'react';

import { useImageRetry } from '@/hooks/useImageRetry';
import { reportImageLoadFailure } from '@/lib/image-failure-monitor';

export function useListingCardImageError(
  listingId: string,
  images: string[],
  imageErrors: Set<number>,
  setImageErrors: React.Dispatch<React.SetStateAction<Set<number>>>,
) {
  const { onImageError: retryImageError } = useImageRetry(images, imageErrors, setImageErrors);

  return useCallback(
    (index: number) => {
      retryImageError(index);
      void reportImageLoadFailure({
        scope: 'listing_card',
        listingId,
        imageUrl: images[index] ?? '',
        imageIndex: index,
        imagesTotal: images.length,
      });
    },
    [retryImageError, images, listingId],
  );
}
