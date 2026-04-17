'use client';

import { useCallback, useEffect, useRef } from 'react';

import { getOptimizedImageUrl } from '@/lib/utils';

export const LISTING_IMAGE_SCHEDULED_RETRY_COUNT = 3;
const MAX_RETRIES = LISTING_IMAGE_SCHEDULED_RETRY_COUNT;
const RETRY_DELAYS_MS = [3000, 8000, 15000];

interface RetryEntry {
  attempt: number;
  timerId: ReturnType<typeof setTimeout>;
}

export function useImageRetry(
  images: string[],
  imageErrors: Set<number>,
  setImageErrors: React.Dispatch<React.SetStateAction<Set<number>>>,
  quality = 65,
  width = 800,
  onFinalFailure?: (index: number, imageUrl: string) => void,
) {
  const retriesRef = useRef<Map<number, RetryEntry>>(new Map());
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const onFinalFailureRef = useRef(onFinalFailure);
  onFinalFailureRef.current = onFinalFailure;

  const clearAllRetries = useCallback(() => {
    for (const entry of retriesRef.current.values()) {
      clearTimeout(entry.timerId);
    }
    retriesRef.current.clear();
  }, []);

  useEffect(() => {
    return () => clearAllRetries();
  }, [clearAllRetries]);

  const imagesSignature = images.join('\u0001');
  useEffect(() => {
    clearAllRetries();
  }, [imagesSignature, clearAllRetries]);

  const resolveAttemptedUrl = useCallback(
    (index: number): string => {
      const src = imagesRef.current[index];
      if (!src || src === '/placeholder-car.jpg') return src ?? '';
      return getOptimizedImageUrl(src, quality, width);
    },
    [quality, width],
  );

  const scheduleRetry = useCallback(
    (index: number) => {
      const existing = retriesRef.current.get(index);
      const attempt = existing ? existing.attempt + 1 : 1;
      if (attempt > MAX_RETRIES) {
        onFinalFailureRef.current?.(index, resolveAttemptedUrl(index));
        retriesRef.current.delete(index);
        return;
      }

      if (existing) {
        clearTimeout(existing.timerId);
      }

      const delay = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];

      const timerId = setTimeout(() => {
        const src = imagesRef.current[index];
        if (!src || src === '/placeholder-car.jpg') {
          retriesRef.current.delete(index);
          return;
        }

        const url = getOptimizedImageUrl(src, quality, width);
        const img = new window.Image();
        img.onload = () => {
          retriesRef.current.delete(index);
          setImageErrors((prev) => {
            if (!prev.has(index)) return prev;
            const next = new Set(prev);
            next.delete(index);
            return next;
          });
        };
        img.onerror = () => {
          scheduleRetry(index);
        };
        img.src = url;
      }, delay);

      retriesRef.current.set(index, { attempt, timerId });
    },
    [quality, width, setImageErrors, resolveAttemptedUrl],
  );

  const onImageError = useCallback(
    (index: number) => {
      setImageErrors((prev) => {
        if (prev.has(index)) return prev;
        const next = new Set(prev);
        next.add(index);
        return next;
      });
      if (retriesRef.current.has(index)) {
        return;
      }
      scheduleRetry(index);
    },
    [setImageErrors, scheduleRetry],
  );

  return { onImageError };
}
