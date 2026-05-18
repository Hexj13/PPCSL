import {
  consumeIndexForListing,
  getIndexForListing,
  resetGalleryNavigationReplayCache,
  setBlurForListing,
  setIndexForListing,
} from '@/lib/blur-navigation-cache';

describe('blur-navigation-cache', () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetGalleryNavigationReplayCache();
  });

  it('consumeIndexForListing returns stored index once and removes it from storage while keeping blur', () => {
    const id = 'listing-1';
    setBlurForListing(id, 'LEHV6nWB2yk8pyo0adR*.7kCMdnj', 'https://example.com/a.jpg');
    setIndexForListing(id, 2);

    expect(consumeIndexForListing(id)).toBe(2);

    const raw = sessionStorage.getItem('listingNav:listing-1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string) as { blurHash?: string; imageIndex?: number };
    expect(parsed.blurHash).toBe('LEHV6nWB2yk8pyo0adR*.7kCMdnj');
    expect(parsed.imageIndex).toBeUndefined();

    expect(getIndexForListing(id)).toBeNull();
  });

  it('consumeIndexForListing replays the same index when called again before a new setIndexForListing', () => {
    const id = 'listing-replay';
    setIndexForListing(id, 4);

    expect(consumeIndexForListing(id)).toBe(4);
    expect(consumeIndexForListing(id)).toBe(4);
    expect(getIndexForListing(id)).toBeNull();
  });

  it('setIndexForListing clears replay cache so a new index can be consumed', () => {
    const id = 'listing-new-index';
    setIndexForListing(id, 1);
    expect(consumeIndexForListing(id)).toBe(1);

    setIndexForListing(id, 3);
    expect(consumeIndexForListing(id)).toBe(3);
  });
});
