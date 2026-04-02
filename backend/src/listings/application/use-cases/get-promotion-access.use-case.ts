import { Injectable } from '@nestjs/common';

import { UserType } from '../../../common/constants';
import { UsersService } from '../../../users/application/users.service';
import { PromotionRulesService } from '../../domain/services/promotion-rules.service';

@Injectable()
export class GetPromotionAccessUseCase {
  constructor(
    private readonly promotionRulesService: PromotionRulesService,
    private readonly usersService: UsersService,
  ) {}

  async execute(
    userId?: string,
    userType?: string,
  ): Promise<{
    access: string;
    enabled: boolean;
    isAdmin: boolean;
    canPromote: boolean;
    isPartner: boolean;
    freePromotionBalance: number;
    partnerListingProgress: number;
    listingsUntilNextFreePromotion: number | null;
  }> {
    const { access, canPromote } = this.promotionRulesService.getPromotionAccessStatus(userType);
    const isAdmin = userType === 'Admin';
    const user = userId ? await this.usersService.findOneById(userId) : null;
    const isBusiness = user?.type === UserType.Business;

    return {
      access,
      enabled: access !== 'disabled',
      isAdmin: isAdmin || false,
      canPromote,
      isPartner: isBusiness && (user?.isPlatformPartner ?? false),
      freePromotionBalance: isBusiness ? (user?.freePromotionBalance ?? 0) : 0,
      partnerListingProgress: isBusiness ? (user?.partnerListingProgress ?? 0) : 0,
      listingsUntilNextFreePromotion:
        isBusiness && user?.isPlatformPartner ? 20 - (user.partnerListingProgress % 20 || 0) : null,
    };
  }
}
