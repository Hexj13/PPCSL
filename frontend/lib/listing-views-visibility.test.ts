import type { User } from '@/lib/api';

import { getListingViewsVisibility, shouldShowListingViews } from './listing-views-visibility';

const adminUser = { type: 'Admin' } as User;
const individualUser = { type: 'Individual' } as User;

describe('listing-views-visibility', () => {
  const originalEnv = process.env.NEXT_PUBLIC_LISTING_VIEWS_VISIBILITY;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_LISTING_VIEWS_VISIBILITY;
    } else {
      process.env.NEXT_PUBLIC_LISTING_VIEWS_VISIBILITY = originalEnv;
    }
  });

  describe('getListingViewsVisibility', () => {
    it('returns all when env is unset', () => {
      delete process.env.NEXT_PUBLIC_LISTING_VIEWS_VISIBILITY;
      expect(getListingViewsVisibility()).toBe('all');
    });

    it('returns all when env is all', () => {
      process.env.NEXT_PUBLIC_LISTING_VIEWS_VISIBILITY = 'all';
      expect(getListingViewsVisibility()).toBe('all');
    });

    it('returns admin when env is admin', () => {
      process.env.NEXT_PUBLIC_LISTING_VIEWS_VISIBILITY = 'admin';
      expect(getListingViewsVisibility()).toBe('admin');
    });

    it('returns all for unknown env values', () => {
      process.env.NEXT_PUBLIC_LISTING_VIEWS_VISIBILITY = 'public';
      expect(getListingViewsVisibility()).toBe('all');
    });
  });

  describe('shouldShowListingViews', () => {
    it('shows views to everyone when visibility is all', () => {
      process.env.NEXT_PUBLIC_LISTING_VIEWS_VISIBILITY = 'all';
      expect(shouldShowListingViews(null, false)).toBe(true);
      expect(shouldShowListingViews(individualUser, true)).toBe(true);
      expect(shouldShowListingViews(adminUser, true)).toBe(true);
    });

    it('hides views until auth is initialized when visibility is admin', () => {
      process.env.NEXT_PUBLIC_LISTING_VIEWS_VISIBILITY = 'admin';
      expect(shouldShowListingViews(adminUser, false)).toBe(false);
    });

    it('shows views only to admin when visibility is admin', () => {
      process.env.NEXT_PUBLIC_LISTING_VIEWS_VISIBILITY = 'admin';
      expect(shouldShowListingViews(null, true)).toBe(false);
      expect(shouldShowListingViews(individualUser, true)).toBe(false);
      expect(shouldShowListingViews(adminUser, true)).toBe(true);
    });
  });
});
