import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { PromotionHistory } from '../../entities/promotion-history.entity';

@Injectable()
export class UpdatePromotionHistoryEndDateUseCase {
  constructor(
    @InjectRepository(PromotionHistory)
    private readonly promotionHistoryRepository: Repository<PromotionHistory>,
  ) {}

  async execute(listingId: string): Promise<void> {
    const lastHistory = await this.promotionHistoryRepository.findOne({
      where: { listing_id: listingId, ended_at: IsNull() },
      order: { started_at: 'DESC' },
    });

    if (lastHistory) {
      lastHistory.ended_at = new Date();
      await this.promotionHistoryRepository.save(lastHistory);
    }
  }
}
