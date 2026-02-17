import type { PromotionRulesConfig } from './promotion-rules.config';

export class PromotionRulesService {
  constructor(private readonly config: PromotionRulesConfig) {}

  getPromotionAccessStatus(userType: string | undefined): { access: string; canPromote: boolean } {
    return {
      access: this.config.promotionAccess,
      canPromote: this.canUserPromote(userType),
    };
  }

  canUserPromote(userType: string | undefined): boolean {
    const { promotionAccess, isDevelopment } = this.config;
    const isAdmin = userType === 'Admin';

    if (promotionAccess === 'all') {
      return true;
    }
    if (promotionAccess === 'admin') {
      return isAdmin;
    }
    if (isDevelopment && isAdmin) {
      return true;
    }
    return false;
  }

  getMaxPromotedListings(): number {
    return this.config.maxPromotedListings;
  }

  calculatePromotionEnd(startDate: Date, days: number): Date {
    const end = new Date(startDate);
    end.setDate(end.getDate() + days);
    return end;
  }

  calculateRemainingDays(pausedAt: Date, until: Date): number {
    const remainingMs = until.getTime() - pausedAt.getTime();
    return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  }
}
