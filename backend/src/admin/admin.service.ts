import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserType } from '../users/entities/user.entity';
import { Listing, ListingStatus } from '../listings/entities/listing.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
  ) {}

  async getAllUsers() {
    return this.usersRepository.find({
      relations: ['listings'],
      order: { created_at: 'DESC' },
    });
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
    return this.usersRepository.save(user);
  }

  async getAllListings() {
    return this.listingsRepository.find({
      relations: ['vehicle', 'vehicle.brand', 'vehicle.model', 'user'],
      order: { created_at: 'DESC' },
    });
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
      where: { type: UserType.Individual },
    });
    const businessUsers = await this.usersRepository.count({
      where: { type: UserType.Business },
    });
    const adminUsers = await this.usersRepository.count({
      where: { type: UserType.Admin },
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
      where: { status: ListingStatus.Active },
    });
    const paused = await this.listingsRepository.count({
      where: { status: ListingStatus.Paused },
    });
    const closed = await this.listingsRepository.count({
      where: { status: ListingStatus.Closed },
    });

    return {
      total,
      active,
      paused,
      closed,
    };
  }
}
