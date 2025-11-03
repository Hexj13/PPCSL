import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import { Listing } from './entities/listing.entity';
import { ListingView } from './entities/listing-view.entity';
import { Vehicle } from './entities/vehicle.entity';
import { UsersModule } from '../users/users.module';
import { BrandsModule } from '../brands/brands.module';

@Module({
  imports: [TypeOrmModule.forFeature([Listing, Vehicle, ListingView]), UsersModule, BrandsModule],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
