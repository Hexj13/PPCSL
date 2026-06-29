import {
  getListingPagePreviewImageUrl,
  LISTING_PAGE_PREVIEW_IMAGE_QUALITY,
  LISTING_PAGE_PREVIEW_IMAGE_WIDTH,
} from '@/lib/listing/listing-page-helpers';
import { getOptimizedImageUrl } from '@/lib/utils';

export const MODAL_IMAGE_WIDTH_LADDER = [1200, 1440, 1920] as const;

export function snapModalImageWidthToLadder(computedWidth: number): number {
  for (const width of MODAL_IMAGE_WIDTH_LADDER) {
    if (computedWidth <= width) {
      return width;
    }
  }
  return MODAL_IMAGE_WIDTH_LADDER[MODAL_IMAGE_WIDTH_LADDER.length - 1];
}

type ModalLayerUrlsParams = {
  src: string;
  imageQuality: number;
  targetImageWidth: number;
  isHiResLoaded: (url: string) => boolean;
};

export function getModalImageLayerUrls({
  src,
  imageQuality,
  targetImageWidth,
  isHiResLoaded,
}: ModalLayerUrlsParams): { confirmedUrl: string; pendingHiResUrl: string | null } {
  const hiResUrl = getOptimizedImageUrl(src, imageQuality, targetImageWidth);
  const previewUrl = getListingPagePreviewImageUrl(src);

  if (isHiResLoaded(hiResUrl) || previewUrl === hiResUrl) {
    return { confirmedUrl: hiResUrl, pendingHiResUrl: null };
  }

  const hiResNotBetterThanPreview =
    targetImageWidth === LISTING_PAGE_PREVIEW_IMAGE_WIDTH &&
    imageQuality <= LISTING_PAGE_PREVIEW_IMAGE_QUALITY;

  if (hiResNotBetterThanPreview) {
    return { confirmedUrl: previewUrl, pendingHiResUrl: null };
  }

  return { confirmedUrl: previewUrl, pendingHiResUrl: hiResUrl };
}

type ModalDisplayUrlsParams = {
  visibleIndex: number;
  currentIndex: number;
  imagesList: string[];
  imageQuality: number;
  targetImageWidth: number;
  isHiResLoaded: (url: string) => boolean;
};

export function getModalDisplayUrls({
  visibleIndex,
  currentIndex,
  imagesList,
  imageQuality,
  targetImageWidth,
  isHiResLoaded,
}: ModalDisplayUrlsParams): { confirmedUrl: string; pendingUrl: string } {
  const visibleSrc = imagesList[visibleIndex];
  const visibleLayers = getModalImageLayerUrls({
    src: visibleSrc,
    imageQuality,
    targetImageWidth,
    isHiResLoaded,
  });

  if (currentIndex === visibleIndex) {
    return {
      confirmedUrl: visibleLayers.confirmedUrl,
      pendingUrl: visibleLayers.pendingHiResUrl ?? '',
    };
  }

  const currentSrc = imagesList[currentIndex];
  const pendingUrl = getOptimizedImageUrl(currentSrc, imageQuality, targetImageWidth);

  return {
    confirmedUrl: visibleLayers.confirmedUrl,
    pendingUrl,
  };
}
