import { Inject, Injectable } from '@nestjs/common';

import { SavedFilter } from '../../entities/saved-filter.entity';
import {
  ISavedFilterRepository,
  SAVED_FILTER_REPOSITORY,
} from '../ports/saved-filter.repository.port';

@Injectable()
export class ListSavedFiltersUseCase {
  constructor(
    @Inject(SAVED_FILTER_REPOSITORY)
    private readonly savedFilterRepository: ISavedFilterRepository,
  ) {}

  execute(userId: string): Promise<SavedFilter[]> {
    return this.savedFilterRepository.findByUser(userId);
  }
}
