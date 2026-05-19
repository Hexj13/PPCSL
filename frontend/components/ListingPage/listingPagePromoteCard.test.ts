import type { Listing, PromotionAccessStatus } from '@/lib/api';

import { listingPageShowsContactCard, listingPageShowsPromoteCard } from './listingPagePromoteCard';

function baseListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'listing-1',
    status: 'Active',
    user: { id: 'seller-1', phone: '+37360000000' },
    is_promoted: false,
    ...overrides,
  } as Listing;
}

const promoteEnabled: PromotionAccessStatus = {
  enabled: true,
  access: 'all',
  isAdmin: false,
};

describe('listingPageShowsPromoteCard', () => {
  it('returns true for own active listing when promotion is enabled', () => {
    expect(listingPageShowsPromoteCard(baseListing(), promoteEnabled, true)).toBe(true);
  });
});

describe('listingPageShowsContactCard', () => {
  it('returns true for open listing with phone when promote is hidden', () => {
    expect(listingPageShowsContactCard(baseListing(), promoteEnabled, false)).toBe(true);
  });

  it('returns false for own listing', () => {
    expect(listingPageShowsContactCard(baseListing(), promoteEnabled, true)).toBe(false);
  });

  it('returns false for closed listing', () => {
    expect(
      listingPageShowsContactCard(baseListing({ status: 'Closed' }), promoteEnabled, false),
    ).toBe(false);
  });

  it('returns false when promote card is shown', () => {
    expect(listingPageShowsContactCard(baseListing(), promoteEnabled, true)).toBe(false);
  });

  it('returns false when seller has no phone', () => {
    expect(
      listingPageShowsContactCard(
        baseListing({ user: { id: 'seller-1', phone: null } as Listing['user'] }),
        promoteEnabled,
        false,
      ),
    ).toBe(false);
  });
});
