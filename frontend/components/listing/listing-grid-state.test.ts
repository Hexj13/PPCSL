/** @jest-environment jsdom */

import type { Listing } from '@/lib/api';

import { saveGridState, shouldRestoreGridStateOnMount } from './listing-grid-state';

function createListing(id: string): Listing {
  return { id } as Listing;
}

describe('shouldRestoreGridStateOnMount', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('does not restore grid state on a direct home reload with stale scroll keys', () => {
    saveGridState([createListing('listing-1')], 1, null, 'body_types=Minivan');
    window.sessionStorage.setItem('homeScrollPosition', '1200');
    window.sessionStorage.setItem('homeScrollTimestamp', String(Date.now()));
    window.sessionStorage.setItem('homeScrollListingId', 'listing-1');
    window.sessionStorage.setItem('homeScrollLastRestPath', '/');

    expect(shouldRestoreGridStateOnMount('body_types=Minivan')).toBe(false);
  });

  it('restores grid state after returning from a listing detail page', () => {
    saveGridState([createListing('listing-1')], 1, null, 'body_types=Minivan');
    window.sessionStorage.setItem('homeScrollPosition', '1200');
    window.sessionStorage.setItem('homeScrollTimestamp', String(Date.now()));
    window.sessionStorage.setItem('homeScrollListingId', 'listing-1');
    window.sessionStorage.setItem('homeScrollLastRestPath', '/listings/listing-1');

    expect(shouldRestoreGridStateOnMount('body_types=Minivan')).toBe(true);
  });
});
