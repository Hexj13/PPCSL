import { Injectable } from '@nestjs/common';

import { PromotionRulesService } from '../../domain/services/promotion-rules.service';

@Injectable()
export class GetPromotionAccessUseCase {
  constructor(private readonly promotionRulesService: PromotionRulesService) {}

  execute(userType?: string): {
    access: string;
    enabled: boolean;
    isAdmin: boolean;
    canPromote: boolean;
  } {
    const { access, canPromote } = this.promotionRulesService.getPromotionAccessStatus(userType);
    const isAdmin = userType === 'Admin';
    return {
      access,
      enabled: access !== 'disabled',
      isAdmin: isAdmin || false,
      canPromote,
    };
  }
}
