import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { ListingsModule } from '../listings/listings.module';
import { SavedFiltersModule } from '../saved-filters/saved-filters.module';

import { CreateSmartSelectionFilterUseCase } from './application/create-smart-selection-filter.use-case';
import { SmartSelectionController } from './smart-selection.controller';

@Module({
  imports: [AuthModule, CommonModule, SavedFiltersModule, ListingsModule],
  controllers: [SmartSelectionController],
  providers: [CreateSmartSelectionFilterUseCase],
})
export class SmartSelectionModule {}
