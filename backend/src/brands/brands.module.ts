import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { Brand } from './entities/brand.entity';
import { VehicleModel } from './entities/vehicle-model.entity';
import { Vehicle } from '../listings/entities/vehicle.entity';
import { Listing } from '../listings/entities/listing.entity';
import { ListingView } from '../listings/entities/listing-view.entity';
import { Favorite } from '../favorites/entities/favorite.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Brand, VehicleModel, Vehicle, Listing, ListingView, Favorite]),
  ],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
