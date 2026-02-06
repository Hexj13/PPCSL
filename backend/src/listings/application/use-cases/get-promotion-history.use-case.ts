import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { PromotionHistory } from '../../entities/promotion-history.entity';

@Injectable()
export class GetPromotionHistoryUseCase {
  constructor(
    @InjectRepository(PromotionHistory)
    private readonly promotionHistoryRepository: Repository<PromotionHistory>,
  ) {}

  async execute(
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    data: Array<
      PromotionHistory & { listing_status?: ListingStatusEnum | null; listing_id: string }
    >;
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const [history, total] = await this.promotionHistoryRepository
      .createQueryBuilder('ph')
      .leftJoinAndSelect('ph.listing', 'listing')
      .where('ph.user_id = :userId', { userId })
      .orderBy('ph.started_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const historyWithStatus = history.map((item) => ({
      ...item,
      listing_status: item.listing?.status ?? null,
    }));

    return {
      data: historyWithStatus,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
