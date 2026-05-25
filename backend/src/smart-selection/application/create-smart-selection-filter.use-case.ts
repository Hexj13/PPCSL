import { Injectable } from '@nestjs/common';

import { I18nService } from '../../common/i18n/i18n.service';
import { SearchListingsUseCase } from '../../listings/application/use-cases/search-listings.use-case';
import { SearchListingsDto } from '../../listings/presentation/dto/search-listings.dto';
import { SavedFilter } from '../../saved-filters/entities/saved-filter.entity';
import { SavedFiltersService } from '../../saved-filters/saved-filters.service';
import { expandFilterUntilEnoughResults } from '../domain/smart-selection-filter-expander';
import {
  mapSmartSelectionToSavedFilter,
  resolveSmartFilterNameKey,
} from '../domain/smart-selection-mapper';
import type { SmartSelectionAnswers } from '../domain/smart-selection.types';

@Injectable()
export class CreateSmartSelectionFilterUseCase {
  constructor(
    private readonly savedFiltersService: SavedFiltersService,
    private readonly searchListingsUseCase: SearchListingsUseCase,
    private readonly i18nService: I18nService,
  ) {}

  async execute(params: {
    userId: string;
    answers: SmartSelectionAnswers;
    locale?: string;
  }): Promise<SavedFilter> {
    const initialFilters = mapSmartSelectionToSavedFilter(params.answers);
    const finalFilters = await expandFilterUntilEnoughResults(
      initialFilters,
      params.answers,
      async (criteria) => {
        const result = await this.searchListingsUseCase.execute(criteria as SearchListingsDto);
        return result.meta.total;
      },
    );

    const nameKey = resolveSmartFilterNameKey(params.answers);
    const name = this.i18nService.translate(nameKey, params.locale);

    return this.savedFiltersService.create(params.userId, name, finalFilters);
  }
}
