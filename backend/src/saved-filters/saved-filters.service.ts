import { Injectable } from '@nestjs/common';

import { CreateSavedFilterUseCase } from './application/use-cases/create-saved-filter.use-case';
import { ListSavedFiltersUseCase } from './application/use-cases/list-saved-filters.use-case';
import { RemoveSavedFilterUseCase } from './application/use-cases/remove-saved-filter.use-case';
import { RenameSavedFilterUseCase } from './application/use-cases/rename-saved-filter.use-case';
import { SavedFilter } from './entities/saved-filter.entity';

@Injectable()
export class SavedFiltersService {
  constructor(
    private readonly createSavedFilterUseCase: CreateSavedFilterUseCase,
    private readonly listSavedFiltersUseCase: ListSavedFiltersUseCase,
    private readonly renameSavedFilterUseCase: RenameSavedFilterUseCase,
    private readonly removeSavedFilterUseCase: RemoveSavedFilterUseCase,
  ) {}

  create(userId: string, name: string, filters: Record<string, unknown>): Promise<SavedFilter> {
    return this.createSavedFilterUseCase.execute(userId, name, filters);
  }

  findAll(userId: string): Promise<SavedFilter[]> {
    return this.listSavedFiltersUseCase.execute(userId);
  }

  update(userId: string, id: string, name: string): Promise<SavedFilter> {
    return this.renameSavedFilterUseCase.execute(userId, id, name);
  }

  remove(userId: string, id: string): Promise<void> {
    return this.removeSavedFilterUseCase.execute(userId, id);
  }
}
