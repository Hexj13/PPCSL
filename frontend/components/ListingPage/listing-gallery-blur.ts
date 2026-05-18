export function galleryImageIndexForBlurHash(
  galleryIndex: number,
  videoSlide: unknown,
): number | null {
  if (videoSlide && galleryIndex === 0) return 0;
  const imageIdx = videoSlide ? galleryIndex - 1 : galleryIndex;
  if (imageIdx < 0) return null;
  return imageIdx;
}
