import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommonModule } from '../common/common.module';

import { BRANDS_CACHE } from './application/ports/brands-cache.port';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { Brand } from './entities/brand.entity';
import { VehicleModel } from './entities/vehicle-model.entity';
import { RedisBrandsCache } from './infrastructure/cache/redis-brands-cache';

@Module({
  imports: [TypeOrmModule.forFeature([Brand, VehicleModel]), CommonModule],
  controllers: [BrandsController],
  providers: [
    BrandsService,
    RedisBrandsCache,
    { provide: BRANDS_CACHE, useExisting: RedisBrandsCache },
  ],
  exports: [BrandsService, BRANDS_CACHE, TypeOrmModule],
})
export class BrandsModule {}
