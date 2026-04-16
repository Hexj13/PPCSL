import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum, UserType as UserTypeEnum } from '../common/types';
import { Listing } from '../listings/entities/listing.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AdminStatsService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
  ) {}

  async getUserStats() {
    const totalUsers = await this.usersRepository.count();
    const individualUsers = await this.usersRepository.count({
      where: { type: UserTypeEnum.Individual },
    });
    const businessUsers = await this.usersRepository.count({
      where: { type: UserTypeEnum.Business },
    });
    const adminUsers = await this.usersRepository.count({
      where: { type: UserTypeEnum.Admin },
    });

    return {
      total: totalUsers,
      individual: individualUsers,
      business: businessUsers,
      admin: adminUsers,
    };
  }

  async getListingStats() {
    const total = await this.listingsRepository.count();
    const active = await this.listingsRepository.count({
      where: { status: ListingStatusEnum.Active },
    });
    const paused = await this.listingsRepository.count({
      where: { status: ListingStatusEnum.Paused },
    });
    const closed = await this.listingsRepository.count({
      where: { status: ListingStatusEnum.Closed },
    });

    return {
      total,
      active,
      paused,
      closed,
    };
  }
}
