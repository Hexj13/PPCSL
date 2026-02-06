import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IBrandsCache, BRANDS_CACHE } from '../brands/application/ports/brands-cache.port';
import { Brand } from '../brands/entities/brand.entity';
import { VehicleModel } from '../brands/entities/vehicle-model.entity';
import { Favorite } from '../favorites/entities/favorite.entity';
import { ListingView } from '../listings/entities/listing-view.entity';
import { Listing } from '../listings/entities/listing.entity';
import { Vehicle } from '../listings/entities/vehicle.entity';

@Injectable()
export class DeleteAllBrandsService {
  private readonly logger = new Logger(DeleteAllBrandsService.name);

  constructor(
    @InjectRepository(Brand)
    private readonly brandsRepository: Repository<Brand>,
    @InjectRepository(VehicleModel)
    private readonly modelsRepository: Repository<VehicleModel>,
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    @InjectRepository(ListingView)
    private readonly listingViewsRepository: Repository<ListingView>,
    @InjectRepository(Favorite)
    private readonly favoritesRepository: Repository<Favorite>,
    @Inject(BRANDS_CACHE)
    private readonly brandsCache: IBrandsCache,
  ) {}

  async execute(): Promise<{
    deletedBrands: number;
    deletedModels: number;
    deletedVehicles: number;
    deletedListings: number;
  }> {
    this.logger.log('Starting deletion of all brands...');

    const allBrands = await this.brandsRepository.find();
    this.logger.log(`Found ${allBrands.length} brands to delete`);

    let deletedListings = 0;
    let deletedVehicles = 0;
    let deletedModels = 0;
    let deletedBrands = 0;

    for (const brand of allBrands) {
      const vehicles = await this.vehiclesRepository.find({
        where: { brand_id: brand.id },
      });

      for (const vehicle of vehicles) {
        const listings = await this.listingsRepository.find({
          where: { vehicle_id: vehicle.id },
        });

        for (const listing of listings) {
          const views = await this.listingViewsRepository.find({
            where: { listing_id: listing.id },
          });
          for (const view of views) {
            await this.listingViewsRepository.remove(view);
          }

          const favorites = await this.favoritesRepository.find({
            where: { listing_id: listing.id },
          });
          for (const favorite of favorites) {
            await this.favoritesRepository.remove(favorite);
          }

          await this.listingsRepository.remove(listing);
          deletedListings++;
        }

        await this.vehiclesRepository.remove(vehicle);
        deletedVehicles++;
      }

      const models = await this.modelsRepository.find({
        where: { brand_id: brand.id },
      });
      for (const model of models) {
        await this.modelsRepository.remove(model);
        deletedModels++;
      }

      await this.brandsRepository.remove(brand);
      deletedBrands++;
      this.logger.log(`Deleted brand: ${brand.name}`);
    }

    try {
      await this.brandsCache.invalidateAll();
    } catch (error) {
      this.logger.warn('Failed to invalidate cache after deleting brands', error);
    }

    this.logger.log(
      `Deletion completed: ${deletedBrands} brands, ${deletedModels} models, ${deletedVehicles} vehicles, ${deletedListings} listings`,
    );

    return {
      deletedBrands,
      deletedModels,
      deletedVehicles,
      deletedListings,
    };
  }
}
