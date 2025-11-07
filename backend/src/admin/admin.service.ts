import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  ListingStatus,
  ListingStatus as ListingStatusEnum,
  UserType as UserTypeEnum,
} from '../common/types';
import { Listing } from '../listings/entities/listing.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
  ) {}

  async getAllUsers(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Omit<User, 'password'>[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;
    const [users, total] = await this.usersRepository.findAndCount({
      relations: ['listings'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    const processedUsers = users.map((user) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: processedUsers,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getUserListings(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: [
        'listings',
        'listings.vehicle',
        'listings.vehicle.brand',
        'listings.vehicle.model',
      ],
    });
    if (!user) {
      throw new NotFoundException('Корисникот не е пронајден');
    }
    return user.listings || [];
  }

  async toggleUserStatus(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Корисникот не е пронајден');
    }
    user.active = !user.active;
    const savedUser = await this.usersRepository.save(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  async getAllListings(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Listing[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;
    const [listings, total] = await this.listingsRepository.findAndCount({
      relations: ['vehicle', 'vehicle.brand', 'vehicle.model', 'user'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    const processedListings = listings.map((listing) => {
      if (listing.user) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = listing.user;
        listing.user = userWithoutPassword as typeof listing.user;

        if (
          listing.status === ListingStatusEnum.Closed ||
          (!listing.user.email && !listing.user.phone)
        ) {
          listing.user.phone = null;
          listing.user.email = null;
          listing.user.firstName = null;
          listing.user.lastName = null;
          listing.user.companyName = null;
        }
      }
      return listing;
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: processedListings,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async updateListingStatus(listingId: string, status: ListingStatus) {
    const listing = await this.listingsRepository.findOne({
      where: { id: listingId },
    });
    if (!listing) {
      throw new NotFoundException('Објавата не е пронајдена');
    }
    listing.status = status;
    return this.listingsRepository.save(listing);
  }

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
