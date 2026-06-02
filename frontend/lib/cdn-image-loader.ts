type CdnImageLoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

function appendLoaderSearchParams(src: string, width: number, quality: number): string {
  const hashIndex = src.indexOf('#');
  const withoutHash = hashIndex >= 0 ? src.slice(0, hashIndex) : src;
  const hash = hashIndex >= 0 ? src.slice(hashIndex) : '';

  const isAbsolute = withoutHash.startsWith('http://') || withoutHash.startsWith('https://');
  if (isAbsolute) {
    const url = new URL(withoutHash);
    url.searchParams.set('w', String(width));
    url.searchParams.set('q', String(quality));
    return `${url.toString()}${hash}`;
  }

  const queryIndex = withoutHash.indexOf('?');
  const pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const existingQuery = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '';
  const params = new URLSearchParams(existingQuery);
  params.set('w', String(width));
  params.set('q', String(quality));
  return `${pathname}?${params.toString()}${hash}`;
}

export default function cdnImageLoader({ src, width, quality = 75 }: CdnImageLoaderProps): string {
  if (!src || src.startsWith('/placeholder') || src.startsWith('data:')) {
    return src;
  }
  if (!src.includes('/api/upload/image/')) {
    return appendLoaderSearchParams(src, width, quality);
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
