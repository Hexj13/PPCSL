import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserType as UserTypeEnum } from '../common/types';

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
      throw new NotFoundException('Корисникот не е пронајден');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByPhone(phone: string): Promise<User> {
    return this.usersRepository.findOne({ where: { phone } });
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
    return user.type === UserTypeEnum.Business ? 50 : 5;
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, updateData);
    return this.findOne(id);
  }
}
