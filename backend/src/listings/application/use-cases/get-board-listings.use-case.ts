import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { removePasswordFromUser } from '../../../common/utils/error-handling.utils';
import { maskPhoneLastDigits } from '../../../common/utils/phone-mask.util';
import { ExchangeRatesService } from '../../../exchange-rates/exchange-rates.service';
import { UsersService } from '../../../users/application/users.service';
import { Listing } from '../../entities/listing.entity';
import { stripListingVideoForListResponse } from '../utils/listing-video-public.util';
import { buildPriceInDefaultCurrencyOrderExpression } from '../utils/price-sort.utils';

@Injectable()
export class GetBoardListingsUseCase {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    private readonly usersService: UsersService,
    private readonly exchangeRatesService: ExchangeRatesService,
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

    const queryBuilder = this.listingsRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.brand', 'brand')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('listing.tire', 'tire')
      .leftJoinAndSelect('tire.brand', 'tireBrand')
      .leftJoinAndSelect('tire.model', 'tireModel')
      .leftJoinAndSelect('listing.user', 'user')
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

    const [listings, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    const listingsWithoutPasswords = listings.map((listing) => {
      if (listing.user) {
        listing.user = removePasswordFromUser(listing.user) as typeof listing.user;
        if (listing.user.phone) {
          listing.user.phone = maskPhoneLastDigits(listing.user.phone);
        }
        if (listing.user.additionalPhone) {
          listing.user.additionalPhone = maskPhoneLastDigits(listing.user.additionalPhone);
        }
      }
      stripListingVideoForListResponse(listing);
      return listing;
    });

    const enriched =
      await this.exchangeRatesService.enrichListingsWithApproxPrice(listingsWithoutPasswords);

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
