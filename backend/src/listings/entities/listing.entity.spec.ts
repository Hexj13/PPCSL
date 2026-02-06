import { ConditionType, Currency, ListingStatus, RegistrationType } from '../../common/types';

import { Listing } from './listing.entity';

const defaults: Partial<Listing> = {
  id: 'listing-1',
  title: 'Test',
  price: 10000,
  currency: Currency.EUR,
  city: 'City',
  status: 'Active' as ListingStatus,
  user_id: 'user-1',
  is_promoted: false,
  promoted_until: null,
  promoted_started_at: null,
  promoted_paused_at: null,
  closed_at: null,
  last_published_at: null,
  condition: 'Undamaged' as ConditionType,
  registration_type: 'Local' as RegistrationType,
  horsepower: 0,
  last_updated_at: new Date(),
  created_at: new Date(),
  updated_at: new Date(),
  views: 0,
};

import { describe, it, expect } from '@jest/globals';

describe('Listing', () => {
  const baseListing = (overrides: Partial<Listing> = {}): Listing =>
    Object.assign(new Listing(), { ...defaults, ...overrides });

  describe('isActive', () => {
    it('returns true when status is Active', () => {
      const listing = baseListing({ status: 'Active' as ListingStatus });
      expect(listing.isActive()).toBe(true);
    });

    it('returns false when status is Paused', () => {
      const listing = baseListing({ status: 'Paused' as ListingStatus });
      expect(listing.isActive()).toBe(false);
    });

    it('returns false when status is Closed', () => {
      const listing = baseListing({ status: 'Closed' as ListingStatus });
      expect(listing.isActive()).toBe(false);
    });
  });

  describe('isPromoted', () => {
    it('returns true when is_promoted is true', () => {
      const listing = baseListing({ is_promoted: true });
      expect(listing.isPromoted()).toBe(true);
    });

    it('returns false when is_promoted is false', () => {
      const listing = baseListing({ is_promoted: false });
      expect(listing.isPromoted()).toBe(false);
    });
  });

  describe('canBeEdited', () => {
    it('returns true for Active and Paused', () => {
      expect(baseListing({ status: 'Active' as ListingStatus }).canBeEdited()).toBe(true);
      expect(baseListing({ status: 'Paused' as ListingStatus }).canBeEdited()).toBe(true);
    });

    it('returns false for Closed', () => {
      expect(baseListing({ status: 'Closed' as ListingStatus }).canBeEdited()).toBe(false);
    });
  });

  describe('canBePublished', () => {
    it('returns false for Closed', () => {
      expect(baseListing({ status: 'Closed' as ListingStatus }).canBePublished()).toBe(false);
    });

    it('returns true for Active and Paused', () => {
      expect(baseListing({ status: 'Active' as ListingStatus }).canBePublished()).toBe(true);
      expect(baseListing({ status: 'Paused' as ListingStatus }).canBePublished()).toBe(true);
    });
  });

  describe('publish', () => {
    it('sets status to Active and last_published_at', () => {
      const listing = baseListing({ status: 'Paused' as ListingStatus });
      listing.publish();
      expect(listing.status).toBe('Active');
      expect(listing.last_published_at).toBeInstanceOf(Date);
    });

    it('throws when status is Closed', () => {
      const listing = baseListing({ status: 'Closed' as ListingStatus });
      expect(() => listing.publish()).toThrow('errors.listingClosedCannotPublish');
    });

    it('resumes paused promotion and extends promoted_until', () => {
      const started = new Date('2025-01-01');
      const until = new Date('2025-01-08');
      const pausedAt = new Date('2025-01-03');
      const listing = baseListing({
        status: 'Paused' as ListingStatus,
        is_promoted: true,
        promoted_started_at: started,
        promoted_until: until,
        promoted_paused_at: pausedAt,
      });
      listing.publish();
      expect(listing.promoted_paused_at).toBeNull();
      expect(listing.promoted_until).toBeInstanceOf(Date);
      expect(listing.status).toBe('Active');
    });
  });

  describe('pause', () => {
    it('sets status to Paused', () => {
      const listing = baseListing({ status: 'Active' as ListingStatus });
      listing.pause();
      expect(listing.status).toBe('Paused');
    });

    it('sets promoted_paused_at when promoted', () => {
      const listing = baseListing({
        status: 'Active' as ListingStatus,
        is_promoted: true,
        promoted_until: new Date('2025-02-01'),
        promoted_paused_at: null,
      });
      listing.pause();
      expect(listing.status).toBe('Paused');
      expect(listing.promoted_paused_at).toBeInstanceOf(Date);
    });
  });

  describe('close', () => {
    it('sets status to Closed and clears promotion', () => {
      const listing = baseListing({
        status: 'Active' as ListingStatus,
        is_promoted: true,
        promoted_until: new Date(),
        promoted_started_at: new Date(),
      });
      listing.close();
      expect(listing.status).toBe('Closed');
      expect(listing.closed_at).toBeInstanceOf(Date);
      expect(listing.is_promoted).toBe(false);
      expect(listing.promoted_until).toBeNull();
      expect(listing.promoted_started_at).toBeNull();
      expect(listing.promoted_paused_at).toBeNull();
    });
  });

  describe('startPromotion', () => {
    it('sets promotion fields for given days', () => {
      const listing = baseListing({ status: 'Active' as ListingStatus });
      listing.startPromotion(7);
      expect(listing.is_promoted).toBe(true);
      expect(listing.promoted_started_at).toBeInstanceOf(Date);
      expect(listing.promoted_paused_at).toBeNull();
      expect(listing.promoted_until).toBeInstanceOf(Date);
    });

    it('throws when status is not Active', () => {
      const listing = baseListing({ status: 'Paused' as ListingStatus });
      expect(() => listing.startPromotion(7)).toThrow('errors.promotionOnlyActive');
    });
  });

  describe('pausePromotion', () => {
    it('sets promoted_paused_at', () => {
      const listing = baseListing({
        is_promoted: true,
        promoted_until: new Date('2025-02-01'),
        promoted_paused_at: null,
      });
      listing.pausePromotion();
      expect(listing.promoted_paused_at).toBeInstanceOf(Date);
    });
  });

  describe('resumePromotion', () => {
    it('extends promoted_until and clears promoted_paused_at', () => {
      const until = new Date('2025-01-10T12:00:00Z');
      const pausedAt = new Date('2025-01-05T12:00:00Z');
      const listing = baseListing({
        is_promoted: true,
        promoted_until: until,
        promoted_paused_at: pausedAt,
      });
      listing.resumePromotion();
      expect(listing.promoted_paused_at).toBeNull();
      expect(listing.promoted_until).toBeInstanceOf(Date);
    });
  });

  describe('stopPromotion', () => {
    it('clears all promotion fields', () => {
      const listing = baseListing({
        is_promoted: true,
        promoted_until: new Date(),
        promoted_started_at: new Date(),
        promoted_paused_at: new Date(),
      });
      listing.stopPromotion();
      expect(listing.is_promoted).toBe(false);
      expect(listing.promoted_until).toBeNull();
      expect(listing.promoted_started_at).toBeNull();
      expect(listing.promoted_paused_at).toBeNull();
    });
  });
});
