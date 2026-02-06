import { PromotionRulesService } from './promotion-rules.service';

describe('PromotionRulesService', () => {
  const withConfig = (config: {
    promotionAccess?: string;
    isDevelopment?: boolean;
    maxPromotedListings?: number;
  }) =>
    new PromotionRulesService({
      promotionAccess: 'disabled',
      isDevelopment: false,
      maxPromotedListings: 10,
      ...config,
    });

  describe('getPromotionAccessStatus', () => {
    it('should return access and canPromote', () => {
      const service = withConfig({ promotionAccess: 'admin', isDevelopment: false });
      expect(service.getPromotionAccessStatus('Admin')).toEqual({
        access: 'admin',
        canPromote: true,
      });
      expect(service.getPromotionAccessStatus('Individual')).toEqual({
        access: 'admin',
        canPromote: false,
      });
    });

    it('should return disabled when PROMOTION_ACCESS is disabled', () => {
      const service = withConfig({ promotionAccess: 'disabled' });
      expect(service.getPromotionAccessStatus(undefined)).toEqual({
        access: 'disabled',
        canPromote: false,
      });
    });
  });

  describe('canUserPromote', () => {
    it('should return true when PROMOTION_ACCESS is all', () => {
      const service = withConfig({ promotionAccess: 'all', isDevelopment: false });
      expect(service.canUserPromote(undefined)).toBe(true);
      expect(service.canUserPromote('Individual')).toBe(true);
      expect(service.canUserPromote('Admin')).toBe(true);
    });

    it('should return true only for Admin when PROMOTION_ACCESS is admin', () => {
      const service = withConfig({ promotionAccess: 'admin', isDevelopment: false });
      expect(service.canUserPromote('Admin')).toBe(true);
      expect(service.canUserPromote('Individual')).toBe(false);
      expect(service.canUserPromote(undefined)).toBe(false);
    });

    it('should return false when PROMOTION_ACCESS is disabled', () => {
      const service = withConfig({ promotionAccess: 'disabled', isDevelopment: false });
      expect(service.canUserPromote('Admin')).toBe(false);
    });

    it('should allow Admin in development when not all', () => {
      const service = withConfig({ promotionAccess: 'disabled', isDevelopment: true });
      expect(service.canUserPromote('Admin')).toBe(true);
      expect(service.canUserPromote('Individual')).toBe(false);
    });
  });

  describe('getMaxPromotedListings', () => {
    it('should return config value', () => {
      const service = withConfig({ maxPromotedListings: 5 });
      expect(service.getMaxPromotedListings()).toBe(5);
    });

    it('should return 10 by default', () => {
      const service = withConfig({});
      expect(service.getMaxPromotedListings()).toBe(10);
    });
  });

  describe('calculatePromotionEnd', () => {
    it('should add days to start date', () => {
      const service = withConfig({});
      const start = new Date('2025-01-10T12:00:00Z');
      const end = service.calculatePromotionEnd(start, 7);
      expect(end.toISOString()).toBe('2025-01-17T12:00:00.000Z');
    });

    it('should handle 1 day', () => {
      const service = withConfig({});
      const start = new Date('2025-01-10T00:00:00Z');
      const end = service.calculatePromotionEnd(start, 1);
      expect(end.getUTCDate()).toBe(11);
    });
  });

  describe('calculateRemainingDays', () => {
    it('should return remaining full days', () => {
      const service = withConfig({});
      const pausedAt = new Date('2025-01-10T00:00:00Z');
      const until = new Date('2025-01-17T00:00:00Z');
      expect(service.calculateRemainingDays(pausedAt, until)).toBe(7);
    });

    it('should ceil partial days', () => {
      const service = withConfig({});
      const pausedAt = new Date('2025-01-10T12:00:00Z');
      const until = new Date('2025-01-17T12:00:00Z');
      expect(service.calculateRemainingDays(pausedAt, until)).toBe(7);
    });
  });
});
