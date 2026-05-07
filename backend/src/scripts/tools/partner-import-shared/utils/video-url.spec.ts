import { describe, expect, it } from '@jest/globals';

import { isProbablyVideoUrl } from './video-url';

describe('isProbablyVideoUrl', () => {
  it('returns true for direct media URLs', () => {
    expect(isProbablyVideoUrl('https://cdn.example.com/a.mp4')).toBe(true);
    expect(isProbablyVideoUrl('https://x.example/trailer.webm')).toBe(true);
  });

  it('returns false for page and embed URLs', () => {
    expect(isProbablyVideoUrl('https://www.youtube.com/watch?v=abc')).toBe(false);
    expect(isProbablyVideoUrl('https://example.com/video/show/1')).toBe(false);
  });
});
