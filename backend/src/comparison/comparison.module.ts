import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Listing } from '../listings/entities/listing.entity';

import { ComparisonController } from './comparison.controller';
import { ComparisonService } from './comparison.service';
import { ComparisonItem } from './entities/comparison-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ComparisonItem, Listing])],
  controllers: [ComparisonController],
  providers: [ComparisonService],
  exports: [ComparisonService],
})
export class ComparisonModule {}
