import cdnImageLoader from './cdn-image-loader';

describe('cdnImageLoader', () => {
  const originalCdnUrl = process.env.NEXT_PUBLIC_IMAGE_CDN_URL;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (originalCdnUrl === undefined) {
      delete process.env.NEXT_PUBLIC_IMAGE_CDN_URL;
    } else {
      process.env.NEXT_PUBLIC_IMAGE_CDN_URL = originalCdnUrl;
    }
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
  });

  it('appends w and q to versioned static paths', () => {
    expect(cdnImageLoader({ src: '/logo-desktop.svg?v=20260313', width: 400, quality: 75 })).toBe(
      '/logo-desktop.svg?v=20260313&w=400&q=75',
    );
  });

  it('appends w and q to static paths without existing query', () => {
    expect(cdnImageLoader({ src: '/partners/cipauto.webp', width: 640, quality: 80 })).toBe(
      '/partners/cipauto.webp?w=640&q=80',
    );
  });

  it('returns placeholder and data URLs unchanged', () => {
    expect(cdnImageLoader({ src: '/placeholder/car.png', width: 400 })).toBe(
      '/placeholder/car.png',
    );
    expect(cdnImageLoader({ src: 'data:image/png;base64,abc', width: 400 })).toBe(
      'data:image/png;base64,abc',
    );
  });

  it('adds width and quality params for upload image URLs', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
    const src = '/api/upload/image/listings/abc.jpg';
    expect(cdnImageLoader({ src, width: 800, quality: 70 })).toBe(
      'https://api.example.com/api/upload/image/listings/abc.jpg?width=800&quality=70',
    );
  });

  it('preserves absolute upload URLs', () => {
    const src = 'https://cdn.example.com/api/upload/image/x.jpg?token=1';
    expect(cdnImageLoader({ src, width: 320 })).toBe(
      'https://cdn.example.com/api/upload/image/x.jpg?token=1&width=320&quality=75',
    );
  });
});
