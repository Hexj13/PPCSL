import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BrandsModule } from '../brands/brands.module';
import { UsersModule } from '../users/users.module';

import { ListingView } from './entities/listing-view.entity';
import { Listing } from './entities/listing.entity';
import { Vehicle } from './entities/vehicle.entity';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
@Module({
  imports: [TypeOrmModule.forFeature([Listing, Vehicle, ListingView]), UsersModule, BrandsModule],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
