import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { logUserEvent } from '../common/utils/log-user-event';

import { SavedFilter } from './entities/saved-filter.entity';

const MAX_SAVED_FILTERS = 20;

@Injectable()
export class SavedFiltersService {
  private readonly logger = new Logger(SavedFiltersService.name);

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
      throw new BadRequestException(`errors.maxSavedFiltersReached|${MAX_SAVED_FILTERS}`);
    }

    const savedFilter = this.savedFiltersRepository.create({
      user_id: userId,
      name,
      filters,
    });

    const saved = await this.savedFiltersRepository.save(savedFilter);
    logUserEvent(this.logger, {
      event: 'saved_filter_created',
      userId,
      savedFilterId: saved.id,
    });
    return saved;
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
      throw new BadRequestException('errors.filterNotFound');
    }

    savedFilter.name = name;
    const updated = await this.savedFiltersRepository.save(savedFilter);
    logUserEvent(this.logger, {
      event: 'saved_filter_updated',
      userId,
      savedFilterId: id,
    });
    return updated;
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.savedFiltersRepository.delete({
      id,
      user_id: userId,
    });

    if (result.affected === 0) {
      throw new BadRequestException('errors.filterNotFound');
    }
    logUserEvent(this.logger, {
      event: 'saved_filter_removed',
      userId,
      savedFilterId: id,
    });
  }
}
