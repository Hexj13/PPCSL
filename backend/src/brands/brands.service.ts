import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { VehicleModel } from './entities/vehicle-model.entity';
import { Vehicle } from '../listings/entities/vehicle.entity';
import { Listing } from '../listings/entities/listing.entity';
import { ListingView } from '../listings/entities/listing-view.entity';
import { Favorite } from '../favorites/entities/favorite.entity';

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(
    @InjectRepository(Brand)
    private brandsRepository: Repository<Brand>,
    @InjectRepository(VehicleModel)
    private modelsRepository: Repository<VehicleModel>,
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
    @InjectRepository(ListingView)
    private listingViewsRepository: Repository<ListingView>,
    @InjectRepository(Favorite)
    private favoritesRepository: Repository<Favorite>,
  ) {}

  async findAll(): Promise<Brand[]> {
    return this.brandsRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Brand> {
    return this.brandsRepository.findOne({
      where: { id },
      relations: ['models'],
    });
  }

  async findByName(name: string): Promise<Brand> {
    return this.brandsRepository.findOne({
      where: { name },
    });
  }

  async getModelsByBrand(brandId: string): Promise<VehicleModel[]> {
    return this.modelsRepository.find({
      where: { brand_id: brandId },
      order: { name: 'ASC' },
      relations: ['brand'],
    });
  }

  async getModelsByBrandName(brandName: string): Promise<VehicleModel[]> {
    const brand = await this.findByName(brandName);
    if (!brand) {
      return [];
    }
    return this.getModelsByBrand(brand.id);
  }

  async addModelsToBrand(
    brandName: string,
    modelNames: string[],
  ): Promise<{ brand: Brand; added: number; updated: number; total: number }> {
    const brand = await this.findByName(brandName);

    if (!brand) {
      throw new Error(`Бренд "${brandName}" не е пронајден`);
    }

    const existingModels = await this.modelsRepository.find({
      where: { brand_id: brand.id },
    });

    let added = 0;
    let updated = 0;
    const maxOrder =
      existingModels.length > 0 ? Math.max(...existingModels.map((m) => m.order || 0)) : 0;

    for (let i = 0; i < modelNames.length; i++) {
      const modelName = modelNames[i];
      const modelNameLower = modelName.toLowerCase();

      const existingModel = existingModels.find((m) => m.name.toLowerCase() === modelNameLower);

      if (!existingModel) {
        const model = this.modelsRepository.create({
          name: modelName,
          brand_id: brand.id,
          order: maxOrder + i + 1,
        });
        await this.modelsRepository.save(model);
        added++;
        this.logger.log(`Added model: ${modelName} to brand: ${brandName}`);
      } else {
        existingModel.order = maxOrder + i + 1;
        await this.modelsRepository.save(existingModel);
        updated++;
      }
    }

    const totalModels = await this.modelsRepository.count({
      where: { brand_id: brand.id },
    });

    return {
      brand,
      added,
      updated,
      total: totalModels,
    };
  }

  async deleteAll(): Promise<{
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
