import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { ExchangeRatesService } from '../../../exchange-rates/exchange-rates.service';
import { UsersService } from '../../../users/application/users.service';
import { Listing } from '../../entities/listing.entity';
import {
  applyListingCardSelects,
  getListingCardPage,
} from '../../infrastructure/persistence/listing-card-query.utils';
import { ListingPublicViewMapper } from '../mappers/listing-public-view.mapper';
import { buildPriceInDefaultCurrencyOrderExpression } from '../utils/price-sort.utils';

@Injectable()
export class GetBoardListingsUseCase {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    private readonly usersService: UsersService,
    private readonly exchangeRatesService: ExchangeRatesService,
    private readonly listingPublicViewMapper: ListingPublicViewMapper,
  ) {}

  async execute(
    boardSlug: string,
    opts: {
      page: number;
      limit: number;
      sortBy: string;
      sortOrder: 'ASC' | 'DESC';
    },
  ): Promise<{
    data: Listing[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const user = await this.usersService.findByBoardSlug(boardSlug);
    if (!user) {
      throw new NotFoundException('errors.boardNotFound');
    }
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = opts;
    const validSortFields = ['created_at', 'price', 'year', 'views'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const dateSortColumn = sortField === 'created_at' ? 'last_updated_at' : sortField;
    const skip = (page - 1) * limit;

    const queryBuilder = applyListingCardSelects(
      this.listingsRepository.createQueryBuilder('listing'),
    )
      .where('listing.user_id = :userId', { userId: user.id })
      .andWhere('listing.status = :status', { status: ListingStatusEnum.Active })
      .addSelect(
        `(CASE WHEN listing.is_promoted = true AND (listing.promoted_until IS NULL OR listing.promoted_until > NOW()) THEN 1 ELSE 0 END)`,
        'actively_promoted',
      )
      .orderBy('actively_promoted', 'DESC');

    if (dateSortColumn === 'year') {
      queryBuilder.addOrderBy('vehicle.year', order);
    } else if (dateSortColumn === 'views') {
      queryBuilder.addOrderBy('listing.views', order);
    } else if (dateSortColumn === 'price') {
      const { defaultCurrency, rates } = await this.exchangeRatesService.getAllRatesMap();
      const { expression, params } = buildPriceInDefaultCurrencyOrderExpression(
        defaultCurrency,
        rates,
      );
      for (const [key, value] of Object.entries(params)) {
        queryBuilder.setParameter(key, value);
      }
      queryBuilder.addSelect(expression, 'price_in_default_currency');
      queryBuilder.addOrderBy('price_in_default_currency', order);
    } else {
      queryBuilder.addOrderBy(`listing.${dateSortColumn}`, order);
    }
    queryBuilder.addOrderBy('listing.id', 'ASC');

    const total = await queryBuilder.getCount();
    const listings = await getListingCardPage(queryBuilder, skip, limit);
    const masked = this.listingPublicViewMapper.toListViews(listings);
    const enriched = await this.exchangeRatesService.enrichListingsWithApproxPrice(masked);

    return {
      data: enriched,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
