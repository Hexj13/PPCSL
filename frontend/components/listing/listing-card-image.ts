import cdnImageLoader from '@/lib/cdn-image-loader';
import { getOptimizedImageUrl } from '@/lib/utils';

export const CARD_IMAGE_QUALITY = 65;

export const CARD_IMAGE_SIZES =
  '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw';

export const CARD_IMAGE_DEVICE_WIDTHS = [640, 750, 828, 1080, 1200, 1920, 2048, 3840] as const;

export function getListingCardImageSrc(imageUrl: string): string {
  if (!imageUrl || imageUrl === '/placeholder-car.jpg') {
    return imageUrl;
  }
  return getOptimizedImageUrl(imageUrl, CARD_IMAGE_QUALITY);
}

export function buildListingCardImageSrcSet(imageUrl: string): string {
  if (!imageUrl || imageUrl === '/placeholder-car.jpg') {
    return '';
  }
  const src = getListingCardImageSrc(imageUrl);
  return CARD_IMAGE_DEVICE_WIDTHS.map(
    (width) => `${cdnImageLoader({ src, width, quality: CARD_IMAGE_QUALITY })} ${width}w`,
  ).join(', ');
}

export function applyListingCardResponsivePreload(img: HTMLImageElement, imageUrl: string): void {
  const srcSet = buildListingCardImageSrcSet(imageUrl);
  if (!srcSet) {
    img.src = imageUrl;
    return;
  }
  const src = getListingCardImageSrc(imageUrl);
  img.sizes = CARD_IMAGE_SIZES;
  img.srcset = srcSet;
  img.src = cdnImageLoader({
    src,
    width: CARD_IMAGE_DEVICE_WIDTHS[0],
    quality: CARD_IMAGE_QUALITY,
  });
}
