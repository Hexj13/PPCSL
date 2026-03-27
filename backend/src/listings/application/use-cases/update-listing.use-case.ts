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
import { isValidTireDiameterInch, ListingCategory } from '../../../common/constants';
import { I18nService } from '../../../common/i18n/i18n.service';
import { removePasswordFromUser } from '../../../common/utils/error-handling.utils';
import { normalizeDescriptionHtml, sanitizeHtml } from '../../../common/utils/html-sanitizer';
import { TireModel } from '../../../tires/entities/tire-model.entity';
import { Tire } from '../../../tires/entities/tire.entity';
import { UploadService } from '../../../upload/upload.service';
import { ListingTitleService } from '../../domain/services/listing-title.service';
import { Listing } from '../../entities/listing.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { UpdateListingDto } from '../../presentation/dto/update-listing.dto';
import { UpdateTireDto } from '../../presentation/dto/update-tire.dto';
import { IListingCache, LISTING_CACHE } from '../ports/listing-cache.port';
import {
  coverBlurHashFromImageBlurHashes,
  validateImageBlurHashesMatchImages,
} from '../utils/image-blur-hashes.utils';

function collapseInternalWhitespace(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

@Injectable()
export class UpdateListingUseCase {
  private readonly logger = new Logger(UpdateListingUseCase.name);

  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(Tire)
    private readonly tireRepository: Repository<Tire>,
    @InjectRepository(TireModel)
    private readonly tireModelRepository: Repository<TireModel>,
    private readonly brandsService: BrandsService,
    private readonly i18nService: I18nService,
    private readonly listingTitleService: ListingTitleService,
    private readonly uploadService: UploadService,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
    @Inject(BRANDS_CACHE)
    private readonly brandsCache: IBrandsCache,
  ) {}

  private assertTireMergedRules(tire: Tire): void {
    if (tire.studded === true && tire.season !== 'winter') {
      this.logger.warn(
        JSON.stringify({
          event: 'tire_validation_failed',
          rule: 'studded_only_winter',
          season: tire.season,
        }),
      );
      throw new BadRequestException('errors.tireStuddedOnlyWinter');
    }
    if (tire.run_flat === true && tire.tire_vehicle_type !== 'car') {
      this.logger.warn(
        JSON.stringify({
          event: 'tire_validation_failed',
          rule: 'run_flat_only_car',
          tire_vehicle_type: tire.tire_vehicle_type,
        }),
      );
      throw new BadRequestException('errors.tireRunFlatOnlyCar');
    }
    const d = Number(tire.diameter_inch);
    if (!isValidTireDiameterInch(d)) {
      this.logger.warn(
        JSON.stringify({
          event: 'tire_validation_failed',
          rule: 'diameter_invalid',
          diameter_inch: d,
        }),
      );
      throw new BadRequestException('errors.tireDiameterInvalid');
    }
  }

  async execute(
    id: string,
    updateListingDto: UpdateListingDto,
    userId: string,
    userType?: string,
  ): Promise<Listing> {
    const listing = await this.listingsRepository.findOne({
      where: { id },
      relations: ['vehicle', 'tire', 'tire.brand', 'tire.model'],
    });

    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }

    const isAdmin = userType === 'Admin';

    if (!isAdmin && listing.user_id !== userId) {
      throw new ForbiddenException('errors.listingAccessDenied');
    }

    if (!isAdmin && listing.status === 'Closed') {
      throw new BadRequestException('errors.cannotEditClosedListing');
    }

    if (updateListingDto.category !== undefined && updateListingDto.category !== listing.category) {
      throw new BadRequestException('errors.listingCategoryImmutable');
    }

    if (updateListingDto.vehicle != null && updateListingDto.tire != null) {
      throw new BadRequestException('errors.listingMixedVehicleTire');
    }

    if (updateListingDto.images !== undefined) {
      const minImages = listing.category === ListingCategory.Tire ? 1 : 2;
      if (updateListingDto.images.length < minImages) {
        throw new BadRequestException(
          listing.category === ListingCategory.Tire
            ? 'validation.listingImagesMinTire|1'
            : 'validation.listingImagesMinVehicle|2',
        );
      }
    }

    if (listing.category === ListingCategory.Tire) {
      if (updateListingDto.vehicle) {
        throw new BadRequestException('errors.listingMixedVehicleTire');
      }
      return this.executeTireListingUpdate(id, listing, updateListingDto, userId, isAdmin);
    }

    if (updateListingDto.tire) {
      throw new BadRequestException('errors.listingMixedVehicleTire');
    }

    return this.executeVehicleListingUpdate(
      id,
      listing,
      updateListingDto,
      userId,
      userType,
      isAdmin,
    );
  }

  private async executeTireListingUpdate(
    id: string,
    listing: Listing,
    updateListingDto: UpdateListingDto,
    userId: string,
    isAdmin: boolean,
  ): Promise<Listing> {
    void userId;
    void isAdmin;

    if (!listing.tire_id) {
      throw new NotFoundException('errors.tireNotFoundForListing');
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

    const imagesForBlurValidation = updateListingDto.images ?? listing.images ?? [];
    const blurHashesError = validateImageBlurHashesMatchImages(
      updateListingDto.image_blur_hashes,
      imagesForBlurValidation,
    );
    if (blurHashesError) {
      throw new BadRequestException(blurHashesError);
    }

    const tire = await this.tireRepository.findOne({
      where: { id: listing.tire_id },
      relations: ['brand', 'model'],
    });
    if (!tire || !tire.brand) {
      throw new NotFoundException('errors.tireNotFoundForListing');
    }

    if (updateListingDto.tire) {
      await this.applyTirePatch(tire, updateListingDto.tire);
      this.assertTireMergedRules(tire);
      await this.tireRepository.save(tire);
    }

    const refreshedTire = await this.tireRepository.findOne({
      where: { id: listing.tire_id },
      relations: ['brand', 'model'],
    });
    if (!refreshedTire?.brand) {
      throw new NotFoundException('errors.tireNotFoundForListing');
    }

    const title = this.listingTitleService.generateForTire({
      brandName: refreshedTire.brand.name,
      modelName: refreshedTire.model?.name ?? null,
      isOtherModel: Boolean(refreshedTire.model?.is_other),
      customModelName: refreshedTire.custom_model_name,
      width_mm: refreshedTire.width_mm,
      aspect_ratio: refreshedTire.aspect_ratio,
      diameter_inch: Number(refreshedTire.diameter_inch),
      load_index: refreshedTire.load_index,
      speed_index: refreshedTire.speed_index,
    });

    const listingFields = { ...updateListingDto };
    delete (listingFields as Record<string, unknown>).vehicle;
    delete (listingFields as Record<string, unknown>).tire;
    delete (listingFields as Record<string, unknown>).category;
    delete (listingFields as Record<string, unknown>).condition;
    delete (listingFields as Record<string, unknown>).registration_type;
    delete (listingFields as Record<string, unknown>).horsepower;
    delete (listingFields as Record<string, unknown>).power_kw;
    delete (listingFields as Record<string, unknown>).equipment;
    delete (listingFields as Record<string, unknown>).vin;
    delete (listingFields as Record<string, unknown>).is_new;
    delete (listingFields as Record<string, unknown>).available_in_credit;
    delete (listingFields as Record<string, unknown>).down_payment_amount;

    const listingUpdateData: Partial<Listing> = {
      ...(listingFields as Partial<Listing>),
      description: listingFields.description
        ? normalizeDescriptionHtml(sanitizeHtml(listingFields.description)) || undefined
        : listingFields.description,
      last_edited_at: new Date(),
      title,
      is_new: false,
    };

    if (updateListingDto.image_blur_hashes !== undefined) {
      listingUpdateData.cover_blur_hash = coverBlurHashFromImageBlurHashes(
        updateListingDto.image_blur_hashes,
      );
    }

    await this.listingsRepository.update(id, listingUpdateData);
    await this.listingsRepository.manager.connection.queryResultCache?.remove([`listing_${id}`]);

    const freshListing = await this.listingsRepository.findOne({
      where: { id },
      relations: ['tire', 'tire.brand', 'tire.model', 'user'],
    });

    if (!freshListing) {
      throw new NotFoundException('errors.listingNotFound');
    }

    try {
      await this.listingCache.invalidateSearch();
      await this.listingCache.invalidateSingle(id);
    } catch (_: unknown) {
      void _;
    }

    if (freshListing.user) {
      freshListing.user = removePasswordFromUser(freshListing.user) as typeof freshListing.user;
    }

    return freshListing;
  }

  private async applyTirePatch(tire: Tire, td: UpdateTireDto): Promise<void> {
    const isClearedModelId = (v: string | null | undefined): boolean => v === null || v === '';

    if (td.brand_id !== undefined && td.brand_id !== tire.brand_id) {
      tire.brand_id = td.brand_id;
      if (td.model_id !== undefined) {
        if (isClearedModelId(td.model_id)) {
          tire.model_id = null;
          tire.custom_model_name = null;
        } else {
          const newModelId = td.model_id as string;
          await this.assertTireModelForBrand(newModelId, td.brand_id);
          tire.model_id = newModelId;
          const m = await this.tireModelRepository.findOne({ where: { id: newModelId } });
          if (!m) throw new BadRequestException('errors.tireModelNotFound');
          if (m.is_other) {
            const custom = td.custom_model_name?.trim()
              ? collapseInternalWhitespace(td.custom_model_name)
              : null;
            if (!custom || custom.length < 2) {
              throw new BadRequestException('errors.tireCustomModelRequired');
            }
            tire.custom_model_name = custom;
          } else {
            tire.custom_model_name = null;
          }
        }
      } else {
        tire.model_id = null;
        tire.custom_model_name = null;
      }
    } else if (td.model_id !== undefined) {
      if (isClearedModelId(td.model_id)) {
        tire.model_id = null;
        tire.custom_model_name = null;
      } else if (td.model_id !== tire.model_id) {
        const newModelId = td.model_id as string;
        await this.assertTireModelForBrand(newModelId, tire.brand_id);
        tire.model_id = newModelId;
        const m = await this.tireModelRepository.findOne({ where: { id: newModelId } });
        if (!m) throw new BadRequestException('errors.tireModelNotFound');
        if (m.is_other) {
          const custom = td.custom_model_name?.trim()
            ? collapseInternalWhitespace(td.custom_model_name)
            : tire.custom_model_name;
          if (!custom || custom.trim().length < 2) {
            throw new BadRequestException('errors.tireCustomModelRequired');
          }
          tire.custom_model_name = collapseInternalWhitespace(custom);
        } else {
          tire.custom_model_name = null;
        }
      }
    } else if (td.custom_model_name !== undefined) {
      if (!tire.model_id) {
        throw new BadRequestException('errors.tireCustomModelUnexpected');
      }
      const m = await this.tireModelRepository.findOne({ where: { id: tire.model_id } });
      if (!m?.is_other) {
        throw new BadRequestException('errors.tireCustomModelUnexpected');
      }
      const custom = td.custom_model_name?.trim()
        ? collapseInternalWhitespace(td.custom_model_name)
        : null;
      if (!custom || custom.length < 2) {
        throw new BadRequestException('errors.tireCustomModelRequired');
      }
      tire.custom_model_name = custom;
    }

    if (td.tire_vehicle_type !== undefined) tire.tire_vehicle_type = td.tire_vehicle_type;
    if (td.season !== undefined) tire.season = td.season;
    if (td.condition !== undefined) tire.condition = td.condition;
    if (td.width_mm !== undefined) tire.width_mm = td.width_mm;
    if (td.aspect_ratio !== undefined) tire.aspect_ratio = td.aspect_ratio;
    if (td.diameter_inch !== undefined) tire.diameter_inch = td.diameter_inch;
    if (td.quantity !== undefined) tire.quantity = td.quantity;
    if (td.load_index !== undefined) {
      tire.load_index = td.load_index?.trim() ? td.load_index.trim().toUpperCase() : null;
    }
    if (td.speed_index !== undefined) {
      tire.speed_index = td.speed_index?.trim() ? td.speed_index.trim().toUpperCase() : null;
    }
    tire.dot_year = null;
    tire.tread_depth_mm = null;
    if (td.studded !== undefined) tire.studded = td.studded;
    if (td.run_flat !== undefined) tire.run_flat = td.run_flat;
    if (td.reinforced_xl !== undefined) tire.reinforced_xl = td.reinforced_xl;
    if (td.spare_donut !== undefined) tire.spare_donut = td.spare_donut;
    if (td.tubeless !== undefined) tire.tubeless = td.tubeless;
    if (td.acoustic !== undefined) tire.acoustic = td.acoustic;

    if (!tire.model_id) {
      if (tire.custom_model_name) {
        throw new BadRequestException('errors.tireCustomModelUnexpected');
      }
    } else {
      const mFinal = await this.tireModelRepository.findOne({ where: { id: tire.model_id } });
      if (!mFinal) throw new BadRequestException('errors.tireModelNotFound');
      if (mFinal.is_other && (!tire.custom_model_name || tire.custom_model_name.length < 2)) {
        throw new BadRequestException('errors.tireCustomModelRequired');
      }
      if (!mFinal.is_other && tire.custom_model_name) {
        throw new BadRequestException('errors.tireCustomModelUnexpected');
      }
    }
  }

  private async assertTireModelForBrand(modelId: string, brandId: string): Promise<void> {
    const m = await this.tireModelRepository.findOne({ where: { id: modelId } });
    if (!m || m.brand_id !== brandId || m.is_archived) {
      throw new BadRequestException('errors.tireModelBrandMismatch');
    }
  }

  private async executeVehicleListingUpdate(
    id: string,
    listing: Listing,
    updateListingDto: UpdateListingDto,
    userId: string,
    userType: string | undefined,
    isAdmin: boolean,
  ): Promise<Listing> {
    void userId;
    void userType;
    void isAdmin;

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

    const imagesForBlurValidation = updateListingDto.images ?? listing.images ?? [];
    const blurHashesError = validateImageBlurHashesMatchImages(
      updateListingDto.image_blur_hashes,
      imagesForBlurValidation,
    );
    if (blurHashesError) {
      throw new BadRequestException(blurHashesError);
    }

    const listingFields = { ...updateListingDto };
    delete (listingFields as Record<string, unknown>).vehicle;
    delete (listingFields as Record<string, unknown>).tire;
    delete (listingFields as Record<string, unknown>).category;
    const listingUpdateData: Partial<Listing> = {
      ...(listingFields as Partial<Listing>),
      description: listingFields.description
        ? normalizeDescriptionHtml(sanitizeHtml(listingFields.description)) || undefined
        : listingFields.description,
      last_edited_at: new Date(),
      title: await this.generateTitle(updatedVehicle),
    };
    if (listingUpdateData.available_in_credit === false) {
      listingUpdateData.down_payment_amount = null;
    }
    if (updateListingDto.image_blur_hashes !== undefined) {
      listingUpdateData.cover_blur_hash = coverBlurHashFromImageBlurHashes(
        updateListingDto.image_blur_hashes,
      );
    }

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
