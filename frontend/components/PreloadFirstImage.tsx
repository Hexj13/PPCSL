'use client';

import { useEffect } from 'react';

import { getOptimizedImageUrl } from '@/lib/utils';

interface PreloadFirstImageProps {
  imageUrl: string | null | undefined;
}

export function PreloadFirstImage({ imageUrl }: PreloadFirstImageProps) {
  useEffect(() => {
    if (!imageUrl || imageUrl === '/placeholder-car.jpg') {
      return;
    }

    const isMobile = window.innerWidth < 768;
    const width = isMobile ? 640 : 800;
    const quality = isMobile ? 60 : 65;
    const optimizedUrl = getOptimizedImageUrl(imageUrl, quality, width);

    if (optimizedUrl === '/placeholder-car.jpg') {
      return;
    }

    const existingLink = document.querySelector(`link[rel="preload"][href="${optimizedUrl}"]`);
    if (existingLink) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = optimizedUrl;
    link.crossOrigin = 'anonymous';
    link.setAttribute('fetchpriority', 'high');

    document.head.appendChild(link);

    return () => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    };
  }, [imageUrl]);

  return null;
}
