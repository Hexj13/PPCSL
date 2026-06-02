import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { buildPaginationMeta } from '../../../common/utils/pagination.utils';
import { PromotionHistory } from '../../entities/promotion-history.entity';

export interface AdminPromotionsQuery {
  page?: number;
  limit?: number;
  listingId?: string;
  userId?: string;
  fromDate?: Date;
}

@Injectable()
export class GetAdminPromotionsUseCase {
  constructor(
    @InjectRepository(PromotionHistory)
    private readonly promotionHistoryRepository: Repository<PromotionHistory>,
  ) {}

  async execute(query: AdminPromotionsQuery): Promise<{
    data: Array<PromotionHistory & { listing_status?: ListingStatusEnum; listing_id: string }>;
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const { page = 1, limit = 50, listingId, userId, fromDate } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.promotionHistoryRepository
      .createQueryBuilder('ph')
      .leftJoinAndSelect('ph.listing', 'listing')
      .orderBy('ph.started_at', 'DESC');

    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (listingId && userId) {
      conditions.push(
        '(CAST(ph.listing_id AS TEXT) = :listingId OR CAST(ph.user_id AS TEXT) = :userId)',
      );
      params.listingId = listingId;
      params.userId = userId;
    } else if (listingId) {
      conditions.push('CAST(ph.listing_id AS TEXT) = :listingId');
      params.listingId = listingId;
    } else if (userId) {
      conditions.push('CAST(ph.user_id AS TEXT) = :userId');
      params.userId = userId;
    }

    if (fromDate) {
      conditions.push('ph.started_at >= :fromDate');
      params.fromDate = fromDate;
    }

    if (conditions.length > 0) {
      queryBuilder.where(conditions.join(' AND '), params);
    }

    const [history, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    const historyWithStatus = history.map((item) => ({
      ...item,
      listing_status: item.listing?.status || null,
    }));

    return {
      data: historyWithStatus,
      meta: buildPaginationMeta(total, page, limit),
    };
  }
}
