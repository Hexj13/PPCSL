import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PromotionHistory } from '../../entities/promotion-history.entity';

@Injectable()
export class HasPromotionHistoryUseCase {
  constructor(
    @InjectRepository(PromotionHistory)
    private readonly promotionHistoryRepository: Repository<PromotionHistory>,
  ) {}

  async execute(userId: string): Promise<boolean> {
    const count = await this.promotionHistoryRepository.count({
      where: { user_id: userId },
    });
    return count > 0;
  }
}
