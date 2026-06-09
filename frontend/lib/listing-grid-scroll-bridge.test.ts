/** @jest-environment jsdom */

import {
  LISTING_GRID_SCROLL_TO_LISTING_EVENT,
  isSafeListingGridScrollId,
  requestListingGridScrollToListing,
} from './listing-grid-scroll-bridge';

describe('listing-grid-scroll-bridge', () => {
  it('dispatches listing grid scroll event with listing id', () => {
    const handler = jest.fn();
    window.addEventListener(LISTING_GRID_SCROLL_TO_LISTING_EVENT, handler);

    requestListingGridScrollToListing('listing-42');

    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent<{ listingId: string }>).detail.listingId).toBe(
      'listing-42',
    );

    window.removeEventListener(LISTING_GRID_SCROLL_TO_LISTING_EVENT, handler);
  });

  it('ignores unsafe listing ids', () => {
    const handler = jest.fn();
    window.addEventListener(LISTING_GRID_SCROLL_TO_LISTING_EVENT, handler);

    requestListingGridScrollToListing('"><script>');

    expect(handler).not.toHaveBeenCalled();
    expect(isSafeListingGridScrollId('listing-42')).toBe(true);
    expect(isSafeListingGridScrollId('"><script>')).toBe(false);

    window.removeEventListener(LISTING_GRID_SCROLL_TO_LISTING_EVENT, handler);
  });
});
