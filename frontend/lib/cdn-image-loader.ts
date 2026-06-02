type CdnImageLoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

export default function cdnImageLoader({ src, width, quality = 75 }: CdnImageLoaderProps): string {
  if (!src || src.startsWith('/placeholder') || src.startsWith('data:')) {
    return src;
  }
  if (!src.includes('/api/upload/image/')) {
    return src;
  }
  try {
    const base =
      src.startsWith('http://') || src.startsWith('https://')
        ? src
        : `${process.env.NEXT_PUBLIC_IMAGE_CDN_URL || process.env.NEXT_PUBLIC_API_URL || ''}${src}`;
    const url = new URL(base);
    url.searchParams.set('width', String(width));
    url.searchParams.set('quality', String(quality));
    return url.toString();
  } catch {
    return src;
  }
}
