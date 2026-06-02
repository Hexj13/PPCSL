import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';

import { SAVED_FILTER_REPOSITORY } from './application/ports/saved-filter.repository.port';
import { CreateSavedFilterUseCase } from './application/use-cases/create-saved-filter.use-case';
import { ListSavedFiltersUseCase } from './application/use-cases/list-saved-filters.use-case';
import { RemoveSavedFilterUseCase } from './application/use-cases/remove-saved-filter.use-case';
import { RenameSavedFilterUseCase } from './application/use-cases/rename-saved-filter.use-case';
import { SavedFilter } from './entities/saved-filter.entity';
import { TypeOrmSavedFilterRepository } from './infrastructure/persistence/typeorm-saved-filter.repository';
import { SavedFiltersController } from './saved-filters.controller';
import { SavedFiltersService } from './saved-filters.service';

@Module({
  imports: [TypeOrmModule.forFeature([SavedFilter]), AuthModule],
  controllers: [SavedFiltersController],
  providers: [
    SavedFiltersService,
    CreateSavedFilterUseCase,
    ListSavedFiltersUseCase,
    RenameSavedFilterUseCase,
    RemoveSavedFilterUseCase,
    TypeOrmSavedFilterRepository,
    { provide: SAVED_FILTER_REPOSITORY, useExisting: TypeOrmSavedFilterRepository },
  ],
  exports: [SavedFiltersService],
})
export class SavedFiltersModule {}
