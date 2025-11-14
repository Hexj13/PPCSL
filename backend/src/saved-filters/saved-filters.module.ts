import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SavedFilter } from './entities/saved-filter.entity';
import { SavedFiltersController } from './saved-filters.controller';
import { SavedFiltersService } from './saved-filters.service';

@Module({
  imports: [TypeOrmModule.forFeature([SavedFilter])],
  controllers: [SavedFiltersController],
  providers: [SavedFiltersService],
  exports: [SavedFiltersService],
})
export class SavedFiltersModule {}
