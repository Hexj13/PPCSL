import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './entities/user.entity';

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

  async findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { phone, active: true },
    });
  }

  async getActiveListingsCount(userId: string): Promise<number> {
    const user = await this.findOne(userId);
    if (!user.listings) {
      return 0;
    }
    return user.listings.filter((listing) => listing.status === 'Active').length;
  }

  async getListingLimit(userId: string): Promise<number> {
    await this.findOne(userId);
    return 100;
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, updateData);
    return this.findOne(id);
  }

  async findByBoardSlug(boardSlug: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { board_slug: boardSlug, active: true },
    });
  }

  async ensureBoardSlug(userId: string): Promise<string> {
    const user = await this.findOne(userId);
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
    if (user.type === 'Business' && user.companyName) {
      return user.companyName;
    }
    if (user.firstName?.trim()) {
      return user.firstName.trim();
    }
    return user.phone || '';
  }
}
