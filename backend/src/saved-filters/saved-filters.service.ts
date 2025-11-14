import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SavedFilter } from './entities/saved-filter.entity';

const MAX_SAVED_FILTERS = 20;

@Injectable()
export class SavedFiltersService {
  constructor(
    @InjectRepository(SavedFilter)
    private savedFiltersRepository: Repository<SavedFilter>,
  ) {}

  async create(
    userId: string,
    name: string,
    filters: Record<string, unknown>,
  ): Promise<SavedFilter> {
    const count = await this.savedFiltersRepository.count({
      where: { user_id: userId },
    });

    if (count >= MAX_SAVED_FILTERS) {
      throw new BadRequestException(
        `Можете да зачувате максимум ${MAX_SAVED_FILTERS} филтри. Ве молиме избришете некој од постоечките филтри.`,
      );
    }

    const savedFilter = this.savedFiltersRepository.create({
      user_id: userId,
      name,
      filters,
    });

    return this.savedFiltersRepository.save(savedFilter);
  }

  async findAll(userId: string): Promise<SavedFilter[]> {
    return this.savedFiltersRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async update(userId: string, id: string, name: string): Promise<SavedFilter> {
    const savedFilter = await this.savedFiltersRepository.findOne({
      where: { id, user_id: userId },
    });

    if (!savedFilter) {
      throw new BadRequestException('Филтерот не е пронајден');
    }

    savedFilter.name = name;
    return this.savedFiltersRepository.save(savedFilter);
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.savedFiltersRepository.delete({
      id,
      user_id: userId,
    });

    if (result.affected === 0) {
      throw new BadRequestException('Филтерот не е пронајден');
    }
  }
}
