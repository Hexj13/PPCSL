import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { removePasswordFromUser } from '../../../common/utils/error-handling.utils';
import { UsersService } from '../../../users/application/users.service';
import { Listing } from '../../entities/listing.entity';

@Injectable()
export class GetBoardListingsUseCase {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    private readonly usersService: UsersService,
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
    const skip = (page - 1) * limit;

    const queryBuilder = this.listingsRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.brand', 'brand')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('listing.user', 'user')
      .where('listing.user_id = :userId', { userId: user.id })
      .andWhere('listing.status = :status', { status: ListingStatusEnum.Active })
      .orderBy('listing.is_promoted', 'DESC');

    if (sortField === 'year') {
      queryBuilder.addOrderBy('vehicle.year', order);
    } else if (sortField === 'views') {
      queryBuilder.addOrderBy('listing.views', order);
    } else {
      queryBuilder.addOrderBy(`listing.${sortField}`, order);
    }

    const [listings, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    const listingsWithoutPasswords = listings.map((listing) => {
      if (listing.user) {
        listing.user = removePasswordFromUser(listing.user) as typeof listing.user;
      }
      return listing;
    });

    return {
      data: listingsWithoutPasswords,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
