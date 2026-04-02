import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { IPromotionHistoryWriter } from '../../application/ports/promotion-history.port';
import { PromotionHistory } from '../../entities/promotion-history.entity';

@Injectable()
export class TypeOrmPromotionHistoryWriter implements IPromotionHistoryWriter {
  constructor(
    @InjectRepository(PromotionHistory)
    private readonly repository: Repository<PromotionHistory>,
  ) {}

  async create(params: {
    listing_id: string;
    user_id: string;
    listing_title: string;
    started_at: Date;
    ended_at: null;
    days: number | null;
    promotion_source: 'duration' | 'partner_balance' | 'admin_unlimited';
  }): Promise<void> {
    await this.repository.save(params);
  }

  async updateEndDateForListing(listingId: string): Promise<void> {
    const last = await this.repository.findOne({
      where: { listing_id: listingId, ended_at: IsNull() },
      order: { started_at: 'DESC' },
    });
    if (last) {
      last.ended_at = new Date();
      await this.repository.save(last);
    }
  }
}
