import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommonModule } from '../common/common.module';

import { TIRES_CACHE } from './application/ports/tires-cache.port';
import { TireBrand } from './entities/tire-brand.entity';
import { TireModel } from './entities/tire-model.entity';
import { RedisTiresCache } from './infrastructure/cache/redis-tires-cache';
import { TiresController } from './tires.controller';
import { TiresService } from './tires.service';

@Module({
  imports: [TypeOrmModule.forFeature([TireBrand, TireModel]), CommonModule],
  controllers: [TiresController],
  providers: [
    TiresService,
    RedisTiresCache,
    { provide: TIRES_CACHE, useExisting: RedisTiresCache },
  ],
  exports: [TiresService, TIRES_CACHE, TypeOrmModule],
})
export class TiresModule {}
