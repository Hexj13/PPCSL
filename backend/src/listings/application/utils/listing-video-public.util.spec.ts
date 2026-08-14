import type { Listing } from '../../entities/listing.entity';

import { stripListingVideoForListResponse } from './listing-video-public.util';

describe('stripListingVideoForListResponse', () => {
  it('keeps has_video and removes video when has_video is already set', () => {
    const listing = {
      has_video: true,
      video: { status: 'published', webmKey: '/out.webm' },
    } as Listing & { has_video?: boolean };

    stripListingVideoForListResponse(listing);

    expect(listing.has_video).toBe(true);
    expect(listing.video).toBeUndefined();
  });

  it('derives has_video from video when the flag is missing', () => {
    const listing = {
      video: { status: 'published', webmKey: '/out.webm' },
    } as Listing & { has_video?: boolean };

    stripListingVideoForListResponse(listing);

    expect(listing.has_video).toBe(true);
    expect(listing.video).toBeUndefined();
  });
});
