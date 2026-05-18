import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../entities/user.entity';

function phoneToSlugBase(phone: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits || 'user';
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['listings'],
    });
  }

  async findOneById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('errors.userNotFound');
    }
    return user;
  }

  async findPublicProfile(id: string): Promise<{
    id: string;
    type: string;
    firstName: string | null;
    companyName: string | null;
    board_slug: string | null;
    created_at: Date;
  }> {
    const user = await this.usersRepository.findOne({
      where: { id, active: true },
      select: ['id', 'type', 'firstName', 'companyName', 'board_slug', 'created_at'],
    });
    if (!user) {
      throw new NotFoundException('errors.userNotFound');
    }
    return {
      id: user.id,
      type: user.type,
      firstName: user.firstName,
      companyName: user.companyName,
      board_slug: user.board_slug,
      created_at: user.created_at,
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['listings', 'favorites'],
    });
    if (!user) {
      throw new NotFoundException('errors.userNotFound');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email, active: true },
    });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { googleId, active: true },
    });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { phone, active: true },
    });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .andWhere('user.active = true')
      .getOne();
  }

  async findByPhoneWithPassword(phone: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.phone = :phone', { phone })
      .andWhere('user.active = true')
      .getOne();
  }

  async findOneByIdWithPassword(id: string): Promise<User> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) {
      throw new NotFoundException('errors.userNotFound');
    }
    return user;
  }

  async getActiveListingsCount(userId: string): Promise<number> {
    const user = await this.findOne(userId);
    if (!user.listings) {
      return 0;
    }
    return user.listings.filter((listing) => listing.status === 'Active').length;
  }

  async getListingLimit(userId: string): Promise<number> {
    const user = await this.findOne(userId);
    return user.type === 'Business' ? 1000 : 100;
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, updateData);
    return this.findOneById(id);
  }

  async tryConsumeFreePromotionBalance(userId: string): Promise<boolean> {
    const result = await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({
        freePromotionBalance: () => '"free_promotion_balance" - 1',
      })
      .where('id = :userId', { userId })
      .andWhere('type = :type', { type: 'Business' })
      .andWhere('is_platform_partner = true')
      .andWhere('free_promotion_balance > 0')
      .execute();

    return (result.affected ?? 0) > 0;
  }

  async getLastListingRefreshAt(userId: string): Promise<Date | null> {
    const row = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['last_listing_refresh_at'],
    });
    return row?.last_listing_refresh_at ?? null;
  }

  async findByBoardSlug(boardSlug: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { board_slug: boardSlug, active: true },
    });
  }

  async ensureBoardSlug(userId: string, preloadedUser?: User): Promise<string> {
    const user = preloadedUser ?? (await this.findOneById(userId));
    if (user.board_slug) {
      return user.board_slug;
    }
    const phoneBase = phoneToSlugBase(user.phone);
    let candidate = phoneBase || `user-${userId.slice(0, 8)}`;
    let sequence = 0;
    for (;;) {
      const existing = await this.usersRepository.findOne({
        where: { board_slug: candidate },
      });
      if (!existing || existing.id === userId) {
        break;
      }
      sequence += 1;
      candidate = phoneBase ? `${phoneBase}-${sequence}` : `user-${sequence}`;
    }
    await this.usersRepository.update(userId, { board_slug: candidate });
    return candidate;
  }

  getSellerDisplayName(user: User): string {
    return user.getDisplayName();
  }
}
