'use client';

import Image, { type ImageProps } from 'next/image';

import { useImageInflightRefCallback } from '@/hooks/useImageInflightRefCallback';

export function TrackedNextImage(props: ImageProps) {
  const inflightRef = useImageInflightRefCallback();
  return <Image {...props} ref={inflightRef} />;
}
