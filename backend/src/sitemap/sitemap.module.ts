import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Brand } from '../brands/entities/brand.entity';
import { VehicleModel } from '../brands/entities/vehicle-model.entity';
import { CommonModule } from '../common/common.module';
import { Listing } from '../listings/entities/listing.entity';
import { User } from '../users/entities/user.entity';

import { SitemapController } from './sitemap.controller';
import { SitemapService } from './sitemap.service';

@Module({
  imports: [TypeOrmModule.forFeature([Listing, Brand, VehicleModel, User]), CommonModule],
  controllers: [SitemapController],
  providers: [SitemapService],
})
export class SitemapModule {}
