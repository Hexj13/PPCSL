import type { SavedFilter } from '../../entities/saved-filter.entity';

export const SAVED_FILTER_REPOSITORY = Symbol('SAVED_FILTER_REPOSITORY');

export interface ISavedFilterRepository {
  countByUser(userId: string): Promise<number>;
  findByUser(userId: string): Promise<SavedFilter[]>;
  findByIdForUser(id: string, userId: string): Promise<SavedFilter | null>;
  create(data: {
    userId: string;
    name: string;
    filters: Record<string, unknown>;
  }): Promise<SavedFilter>;
  save(filter: SavedFilter): Promise<SavedFilter>;
  deleteForUser(id: string, userId: string): Promise<number>;
}
