import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PromotionHistory } from '../../entities/promotion-history.entity';

@Injectable()
export class CreatePromotionHistoryUseCase {
  constructor(
    @InjectRepository(PromotionHistory)
    private readonly promotionHistoryRepository: Repository<PromotionHistory>,
  ) {}

  async execute(
    listingId: string,
    userId: string,
    listingTitle: string,
    days: number | null,
  ): Promise<void> {
    await this.promotionHistoryRepository.save({
      listing_id: listingId,
      user_id: userId,
      listing_title: listingTitle,
      started_at: new Date(),
      ended_at: null,
      days,
    });
  }
}
