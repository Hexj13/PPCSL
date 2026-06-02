import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ISavedFilterRepository } from '../../application/ports/saved-filter.repository.port';
import { SavedFilter } from '../../entities/saved-filter.entity';

@Injectable()
export class TypeOrmSavedFilterRepository implements ISavedFilterRepository {
  constructor(
    @InjectRepository(SavedFilter)
    private readonly repository: Repository<SavedFilter>,
  ) {}

  countByUser(userId: string): Promise<number> {
    return this.repository.count({ where: { user_id: userId } });
  }

  findByUser(userId: string): Promise<SavedFilter[]> {
    return this.repository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  findByIdForUser(id: string, userId: string): Promise<SavedFilter | null> {
    return this.repository.findOne({ where: { id, user_id: userId } });
  }

  create(data: {
    userId: string;
    name: string;
    filters: Record<string, unknown>;
  }): Promise<SavedFilter> {
    const entity = this.repository.create({
      user_id: data.userId,
      name: data.name,
      filters: data.filters,
    });
    return this.repository.save(entity);
  }

  save(filter: SavedFilter): Promise<SavedFilter> {
    return this.repository.save(filter);
  }

  async deleteForUser(id: string, userId: string): Promise<number> {
    const result = await this.repository.delete({ id, user_id: userId });
    return result.affected ?? 0;
  }
}
