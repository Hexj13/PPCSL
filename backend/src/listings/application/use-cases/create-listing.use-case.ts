import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BrandsService } from '../../../brands/brands.service';
import {
  getDefaultCurrency,
  isValidTireDiameterInch,
  ListingCategory,
} from '../../../common/constants';
import { I18nService } from '../../../common/i18n/i18n.service';
import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { normalizeDescriptionHtml, sanitizeHtml } from '../../../common/utils/html-sanitizer';
import { inferListingCategoryFromPayload } from '../../../common/utils/listing-category.utils';
import { TireBrand } from '../../../tires/entities/tire-brand.entity';
import { TireModel } from '../../../tires/entities/tire-model.entity';
import { Tire } from '../../../tires/entities/tire.entity';
import { UsersService } from '../../../users/application/users.service';
import { ListingTitleService } from '../../domain/services/listing-title.service';
import { Listing } from '../../entities/listing.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { CreateListingDto } from '../../presentation/dto/create-listing.dto';
import { CreateTireDto } from '../../presentation/dto/create-tire.dto';
import { IListingCache, LISTING_CACHE } from '../ports/listing-cache.port';
import { IListingRepository, LISTING_REPOSITORY } from '../ports/listing.repository.port';
import {
  coverBlurHashFromImageBlurHashes,
  validateImageBlurHashesMatchImages,
} from '../utils/image-blur-hashes.utils';

function collapseInternalWhitespace(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

@Injectable()
export class CreateListingUseCase {
  private readonly logger = new Logger(CreateListingUseCase.name);

  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
    private readonly titleService: ListingTitleService,
    private readonly usersService: UsersService,
    private readonly brandsService: BrandsService,
    private readonly i18nService: I18nService,
    @InjectRepository(TireModel)
    private readonly tireModelRepository: Repository<TireModel>,
    @InjectRepository(TireBrand)
    private readonly tireBrandRepository: Repository<TireBrand>,
  ) {}

  async execute(dto: CreateListingDto, userId: string, userType?: string): Promise<Listing> {
    let ownerId = userId;

    if (dto.assignedUserId) {
      if (userType !== 'Admin') {
        throw new ForbiddenException('errors.accessDenied');
      }
      const targetUser = await this.usersService.findOneById(dto.assignedUserId);
      if (!targetUser.active) {
        throw new BadRequestException('errors.assignedUserDeactivated');
      }
      ownerId = targetUser.id;
    }

    if (dto.vehicle != null && dto.tire != null) {
      throw new BadRequestException('errors.listingMixedVehicleTire');
    }

    const category = inferListingCategoryFromPayload(dto);
    if (category === ListingCategory.Tire && dto.vehicle != null) {
      throw new BadRequestException('errors.listingMixedVehicleTire');
    }
    if (category === ListingCategory.Vehicle && dto.tire != null) {
      throw new BadRequestException('errors.listingMixedVehicleTire');
    }

    if (category === ListingCategory.Tire) {
      if (!dto.tire) {
        throw new BadRequestException('errors.tirePayloadRequired');
      }
      return this.executeTire(dto, ownerId);
    }

    if (!dto.vehicle) {
      throw new BadRequestException('errors.vehiclePayloadRequired');
    }

    return this.executeVehicle(dto, ownerId, userType);
  }

  private async executeTire(dto: CreateListingDto, ownerId: string): Promise<Listing> {
    const td = dto.tire as CreateTireDto;
    await this.assertTirePayloadValid(td);

    const brand = await this.tireBrandRepository.findOne({ where: { id: td.brand_id } });
    if (!brand || brand.is_archived) {
      throw new BadRequestException('errors.tireBrandNotFound');
    }

    const hasModelId = Boolean(td.model_id);
    if (!hasModelId && td.custom_model_name?.trim()) {
      throw new BadRequestException('errors.tireCustomModelUnexpected');
    }

    let model: TireModel | null = null;
    if (hasModelId) {
      const loaded = await this.tireModelRepository.findOne({
        where: { id: td.model_id },
        relations: ['brand'],
      });
      if (!loaded || !loaded.brand) {
        throw new BadRequestException('errors.tireModelNotFound');
      }
      model = loaded;
      if (model.brand_id !== td.brand_id) {
        throw new BadRequestException('errors.tireModelBrandMismatch');
      }
      if (model.is_archived) {
        throw new BadRequestException('errors.tireModelArchived');
      }

      const customName = td.custom_model_name?.trim()
        ? collapseInternalWhitespace(td.custom_model_name)
        : null;
      if (model.is_other && (!customName || customName.length < 2)) {
        throw new BadRequestException('errors.tireCustomModelRequired');
      }
      if (!model.is_other && customName) {
        throw new BadRequestException('errors.tireCustomModelUnexpected');
      }
    }

    const status = dto.status || ListingStatusEnum.Active;
    if (status === ListingStatusEnum.Active) {
      const activeCount = await this.listingRepo.countActiveByUser(ownerId);
      const limit = await this.usersService.getListingLimit(ownerId);
      if (activeCount >= limit) {
        throw new BadRequestException(`errors.activeListingsLimitExceeded|${limit}`);
      }
    }

    const blurHashesError = validateImageBlurHashesMatchImages(dto.image_blur_hashes, dto.images);
    if (blurHashesError) {
      throw new BadRequestException(blurHashesError);
    }

    const normalizedLoad = td.load_index?.trim() ? td.load_index.trim().toUpperCase() : null;
    const normalizedSpeed = td.speed_index?.trim() ? td.speed_index.trim().toUpperCase() : null;

    const customForDb =
      model?.is_other && td.custom_model_name?.trim()
        ? collapseInternalWhitespace(td.custom_model_name)
        : null;

    const tire = Object.assign(new Tire(), {
      brand_id: td.brand_id,
      model_id: hasModelId ? td.model_id! : null,
      custom_model_name: customForDb,
      tire_vehicle_type: td.tire_vehicle_type,
      season: td.season,
      condition: td.condition,
      width_mm: td.width_mm,
      aspect_ratio: td.aspect_ratio,
      diameter_inch: td.diameter_inch,
      quantity: td.quantity,
      load_index: normalizedLoad,
      speed_index: normalizedSpeed,
      dot_year: null,
      tread_depth_mm: null,
      studded: td.studded ?? null,
      run_flat: td.run_flat ?? null,
      reinforced_xl: td.reinforced_xl ?? null,
      spare_donut: td.spare_donut ?? null,
      tubeless: td.tubeless ?? null,
      acoustic: td.acoustic ?? null,
    });

    const title = this.titleService.generateForTire({
      brandName: brand.name,
      modelName: model?.name ?? null,
      isOtherModel: Boolean(model?.is_other),
      customModelName: tire.custom_model_name,
      width_mm: tire.width_mm,
      aspect_ratio: tire.aspect_ratio,
      diameter_inch: Number(tire.diameter_inch),
      load_index: tire.load_index,
      speed_index: tire.speed_index,
    });

    const listingFields = Object.fromEntries(
      Object.entries(dto).filter(([key]) => !['vehicle', 'tire', 'assignedUserId'].includes(key)),
    ) as Omit<CreateListingDto, 'vehicle' | 'tire' | 'assignedUserId'>;

    const listing = new Listing();
    Object.assign(listing, {
      ...listingFields,
      description: dto.description
        ? normalizeDescriptionHtml(sanitizeHtml(dto.description)) || undefined
        : undefined,
      title,
      status,
      category: ListingCategory.Tire,
      currency: dto.currency || getDefaultCurrency(),
      user_id: ownerId,
      last_updated_at: new Date(),
      last_published_at: status === ListingStatusEnum.Active ? new Date() : null,
      vehicle_id: null,
      condition: null,
      registration_type: null,
      horsepower: null,
      power_kw: null,
      vin: null,
      equipment: null,
      is_new: false,
      available_in_credit: false,
      down_payment_amount: null,
    });
    listing.tire = tire;
    if (dto.image_blur_hashes != null) {
      listing.cover_blur_hash = coverBlurHashFromImageBlurHashes(dto.image_blur_hashes);
    }

    const saved = await this.listingRepo.save(listing);
    await this.listingCache.invalidateSearch();
    await this.listingCache.invalidateSingle(saved.id);
    return saved;
  }

  private async assertTirePayloadValid(td: CreateTireDto): Promise<void> {
    if (td.studded === true && td.season !== 'winter') {
      this.logger.warn(
        JSON.stringify({
          event: 'tire_validation_failed',
          rule: 'studded_only_winter',
          season: td.season,
        }),
      );
      throw new BadRequestException('errors.tireStuddedOnlyWinter');
    }
    if (td.run_flat === true && td.tire_vehicle_type !== 'car') {
      this.logger.warn(
        JSON.stringify({
          event: 'tire_validation_failed',
          rule: 'run_flat_only_car',
          tire_vehicle_type: td.tire_vehicle_type,
        }),
      );
      throw new BadRequestException('errors.tireRunFlatOnlyCar');
    }
    if (!isValidTireDiameterInch(td.diameter_inch)) {
      this.logger.warn(
        JSON.stringify({
          event: 'tire_validation_failed',
          rule: 'diameter_invalid',
          diameter_inch: td.diameter_inch,
        }),
      );
      throw new BadRequestException('errors.tireDiameterInvalid');
    }
  }

  private async executeVehicle(
    dto: CreateListingDto,
    ownerId: string,
    _userType: string | undefined,
  ): Promise<Listing> {
    const vehicle = Object.assign(new Vehicle(), dto.vehicle) as Vehicle;
    if (vehicle.fuel === 'Electric') vehicle.engine_displ_l = null;
    const title = await this.generateTitle(vehicle);

    const status = dto.status || ListingStatusEnum.Active;
    if (status === ListingStatusEnum.Active) {
      const activeCount = await this.listingRepo.countActiveByUser(ownerId);
      const limit = await this.usersService.getListingLimit(ownerId);
      if (activeCount >= limit) {
        throw new BadRequestException(`errors.activeListingsLimitExceeded|${limit}`);
      }
    }

    const blurHashesError = validateImageBlurHashesMatchImages(dto.image_blur_hashes, dto.images);
    if (blurHashesError) {
      throw new BadRequestException(blurHashesError);
    }

    const listingFields = Object.fromEntries(
      Object.entries(dto).filter(([key]) => !['vehicle', 'tire', 'assignedUserId'].includes(key)),
    ) as Omit<CreateListingDto, 'vehicle' | 'tire' | 'assignedUserId'>;
    const listing = new Listing();
    Object.assign(listing, {
      ...listingFields,
      description: dto.description
        ? normalizeDescriptionHtml(sanitizeHtml(dto.description)) || undefined
        : undefined,
      title,
      status,
      category: ListingCategory.Vehicle,
      currency: dto.currency || getDefaultCurrency(),
      user_id: ownerId,
      last_updated_at: new Date(),
      last_published_at: status === ListingStatusEnum.Active ? new Date() : null,
      tire_id: null,
    });
    if (!listing.available_in_credit) {
      listing.down_payment_amount = null;
    }
    listing.vehicle = vehicle;
    if (dto.image_blur_hashes != null) {
      listing.cover_blur_hash = coverBlurHashFromImageBlurHashes(dto.image_blur_hashes);
    }

    const saved = await this.listingRepo.save(listing);
    await this.listingCache.invalidateSearch();
    await this.listingCache.invalidateSingle(saved.id);
    return saved;
  }

  private async generateTitle(vehicle: Vehicle): Promise<string> {
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
      getTransmissionLabel: (key: string) => Promise.resolve(this.i18nService.translate(key)),
    };
    return this.titleService.generate(
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
