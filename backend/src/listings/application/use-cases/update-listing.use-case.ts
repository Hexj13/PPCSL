import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IBrandsCache, BRANDS_CACHE } from '../../../brands/application/ports/brands-cache.port';
import { BrandsService } from '../../../brands/brands.service';
import { I18nService } from '../../../common/i18n/i18n.service';
import { removePasswordFromUser } from '../../../common/utils/error-handling.utils';
import { normalizeDescriptionHtml, sanitizeHtml } from '../../../common/utils/html-sanitizer';
import { UploadService } from '../../../upload/upload.service';
import { ListingTitleService } from '../../domain/services/listing-title.service';
import { Listing } from '../../entities/listing.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { UpdateListingDto } from '../../presentation/dto/update-listing.dto';
import { IListingCache, LISTING_CACHE } from '../ports/listing-cache.port';

@Injectable()
export class UpdateListingUseCase {
  private readonly logger = new Logger(UpdateListingUseCase.name);

  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    private readonly brandsService: BrandsService,
    private readonly i18nService: I18nService,
    private readonly listingTitleService: ListingTitleService,
    private readonly uploadService: UploadService,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
    @Inject(BRANDS_CACHE)
    private readonly brandsCache: IBrandsCache,
  ) {}

  async execute(id: string, updateListingDto: UpdateListingDto, userId: string): Promise<Listing> {
    const listing = await this.listingsRepository.findOne({
      where: { id },
      relations: ['vehicle'],
    });

    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }

    if (listing.user_id !== userId) {
      throw new ForbiddenException('errors.listingAccessDenied');
    }

    if (listing.status === 'Closed') {
      throw new BadRequestException('errors.cannotEditClosedListing');
    }

    const previousBrandId = listing.vehicle?.brand_id;

    if (updateListingDto.vehicle && listing.vehicle_id) {
      const vehicleUpdateData: Partial<Vehicle> = {};
      const vehicleDto = updateListingDto.vehicle;

      if (vehicleDto.brand_id !== undefined) vehicleUpdateData.brand_id = vehicleDto.brand_id;
      if (vehicleDto.model_id !== undefined) vehicleUpdateData.model_id = vehicleDto.model_id;
      if (vehicleDto.year !== undefined) vehicleUpdateData.year = vehicleDto.year;
      if (vehicleDto.engine_displ_l !== undefined)
        vehicleUpdateData.engine_displ_l = vehicleDto.engine_displ_l;
      if (vehicleDto.mileage_km !== undefined) vehicleUpdateData.mileage_km = vehicleDto.mileage_km;
      if (vehicleDto.fuel !== undefined) vehicleUpdateData.fuel = vehicleDto.fuel;
      if (vehicleDto.fuel === 'Electric') vehicleUpdateData.engine_displ_l = null;
      if (vehicleDto.transmission !== undefined)
        vehicleUpdateData.transmission = vehicleDto.transmission;
      if (vehicleDto.drive_type !== undefined) vehicleUpdateData.drive_type = vehicleDto.drive_type;
      if (vehicleDto.body_type !== undefined) vehicleUpdateData.body_type = vehicleDto.body_type;
      if (vehicleDto.color !== undefined) vehicleUpdateData.color = vehicleDto.color;
      if (vehicleDto.doors !== undefined) vehicleUpdateData.doors = vehicleDto.doors;

      if (Object.keys(vehicleUpdateData).length > 0) {
        await this.vehiclesRepository.update(listing.vehicle_id, vehicleUpdateData);
        await this.vehiclesRepository.manager.connection.queryResultCache?.remove([
          `vehicle_${listing.vehicle_id}`,
        ]);
      }
    }

    if (!listing.vehicle_id) {
      throw new NotFoundException('errors.vehicleIdNotFound');
    }
    const updatedVehicle = await this.vehiclesRepository.findOne({
      where: { id: listing.vehicle_id },
      relations: ['brand', 'model'],
    });

    if (!updatedVehicle) {
      throw new NotFoundException('errors.vehicleNotFound');
    }

    if (updateListingDto.images) {
      const oldImages = listing.images ?? [];
      const newImages = updateListingDto.images;
      const removedImages = oldImages.filter((img) => !newImages.includes(img));
      for (const imageUrl of removedImages) {
        const filePath = this.extractPathFromUrl(imageUrl);
        if (filePath) {
          try {
            await this.uploadService.deleteFile(filePath);
          } catch (err) {
            this.logger.warn(
              `Failed to delete orphaned image ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }
    }

    const listingFields = { ...updateListingDto };
    delete (listingFields as Record<string, unknown>).vehicle;
    const listingUpdateData: Partial<Listing> = {
      ...(listingFields as Partial<Listing>),
      description: listingFields.description
        ? normalizeDescriptionHtml(sanitizeHtml(listingFields.description)) || undefined
        : listingFields.description,
      last_edited_at: new Date(),
      title: await this.generateTitle(updatedVehicle),
    };

    await this.listingsRepository.update(id, listingUpdateData);
    await this.listingsRepository.manager.connection.queryResultCache?.remove([`listing_${id}`]);

    const freshListing = await this.listingsRepository.findOne({
      where: { id },
      relations: ['vehicle', 'vehicle.brand', 'vehicle.model', 'user'],
    });

    if (!freshListing) {
      throw new NotFoundException('errors.listingNotFound');
    }

    try {
      await this.listingCache.invalidateSearch();
      await this.listingCache.invalidateSingle(id);
      if (previousBrandId) {
        await this.brandsCache.invalidateModels(previousBrandId);
      }
      if (updatedVehicle.brand_id && updatedVehicle.brand_id !== previousBrandId) {
        await this.brandsCache.invalidateModels(updatedVehicle.brand_id);
      }
    } catch (_: unknown) {
      void _;
    }

    if (freshListing.user) {
      freshListing.user = removePasswordFromUser(freshListing.user) as typeof freshListing.user;
    }

    return freshListing;
  }

  private extractPathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      if (path.startsWith('/uploads/')) return path;
      return null;
    } catch {
      if (url.startsWith('/uploads/')) return url;
      return null;
    }
  }

  private async generateTitle(vehicle: Vehicle, locale?: string): Promise<string> {
    const brandId = vehicle.brand_id;
    const resolver = {
      getBrandName: (id: string) => this.brandsService.findOne(id).then((b) => b?.name ?? null),
      getModelName: (modelId: string) =>
        brandId
          ? this.brandsService
              .getModelsByBrand(brandId)
              .then((models) => models.find((m) => m.id === modelId)?.name ?? null)
          : Promise.resolve(null),
      getModelVehicleType: (modelId: string) =>
        brandId
          ? this.brandsService
              .getModelsByBrand(brandId)
              .then((models) => models.find((m) => m.id === modelId)?.vehicle_types?.[0] ?? null)
          : Promise.resolve(null),
      getTransmissionLabel: (key: string) =>
        Promise.resolve(this.i18nService.translate(key, locale)),
    };
    return this.listingTitleService.generate(
      {
        brand_id: vehicle.brand_id,
        model_id: vehicle.model_id,
        year: vehicle.year,
        transmission: vehicle.transmission ?? undefined,
      },
      resolver,
    );
  }
}
