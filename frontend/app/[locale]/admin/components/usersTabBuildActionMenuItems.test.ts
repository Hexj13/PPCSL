import type { Listing, User } from '@/lib/api';

import {
  buildUsersTabActionMenuItems,
  type UsersTabMenuHandlers,
} from './usersTabBuildActionMenuItems';

function noop() {}

function makeHandlers(): UsersTabMenuHandlers {
  return {
    onCloseMenu: noop,
    onViewListings: noop,
    onRefreshListingDates: noop,
    onShowContacts: noop,
    onEdit: noop,
    onToggleStatus: noop,
  };
}

const t = (key: string) => key;

describe('buildUsersTabActionMenuItems', () => {
  it('should include refresh listing dates when listingCountActive is set and listings array is empty', () => {
    const user: User = {
      id: 'admin-1',
      email: 'admin@example.com',
      type: 'Admin',
      listingCountActive: 2,
      listings: [],
    };
    const items = buildUsersTabActionMenuItems(user, t, makeHandlers());
    expect(items.some((item) => item.id === 'refresh-listing-dates')).toBe(true);
    expect(items.some((item) => item.id === 'view-listings')).toBe(true);
  });

  it('should include refresh listing dates when listingCountActive is absent but an active listing exists in listings', () => {
    const listing = {
      id: 'listing-1',
      title: 'Vehicle',
      city: 'Chisinau',
      status: 'Active',
      last_updated_at: '2026-01-01T00:00:00.000Z',
    } as Listing;
    const user: User = {
      id: 'user-2',
      email: 'seller@example.com',
      type: 'Individual',
      phone: '+373000000',
      listings: [listing],
    };
    const items = buildUsersTabActionMenuItems(user, t, makeHandlers());
    expect(items.some((item) => item.id === 'refresh-listing-dates')).toBe(true);
  });

  it('should omit refresh listing dates when there are no active listings', () => {
    const user: User = {
      id: 'user-3',
      email: 'empty@example.com',
      type: 'Individual',
      phone: '+373000001',
      listingCountActive: 0,
      listings: [],
    };
    const items = buildUsersTabActionMenuItems(user, t, makeHandlers());
    expect(items.some((item) => item.id === 'refresh-listing-dates')).toBe(false);
    expect(items.some((item) => item.id === 'view-listings')).toBe(false);
  });

  it('should omit refresh when listings are non-empty but none are Active even if listingCountActive is positive', () => {
    const listing = {
      id: 'listing-paused',
      title: 'Car',
      city: 'Chisinau',
      status: 'Paused',
      last_updated_at: '2026-01-01T00:00:00.000Z',
    } as Listing;
    const user: User = {
      id: 'user-stale-count',
      email: 'stale@example.com',
      type: 'Individual',
      phone: '+373000003',
      listingCountActive: 3,
      listings: [listing],
    };
    const items = buildUsersTabActionMenuItems(user, t, makeHandlers());
    expect(items.some((item) => item.id === 'refresh-listing-dates')).toBe(false);
    expect(items.some((item) => item.id === 'view-listings')).toBe(true);
  });

  it('should include refresh when listings contain Active even if listingCountActive is zero', () => {
    const listing = {
      id: 'listing-2',
      title: 'Car',
      city: 'Chisinau',
      status: 'Active',
      last_updated_at: '2026-01-01T00:00:00.000Z',
    } as Listing;
    const user: User = {
      id: 'user-4',
      email: 'mixed@example.com',
      type: 'Individual',
      phone: '+373000002',
      listingCountActive: 0,
      listings: [listing],
    };
    const items = buildUsersTabActionMenuItems(user, t, makeHandlers());
    expect(items.some((item) => item.id === 'refresh-listing-dates')).toBe(true);
    expect(items.some((item) => item.id === 'view-listings')).toBe(true);
  });
});
