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
import type { ListingVideoJson } from '../../domain/types/listing-video.types';
import { Listing } from '../../entities/listing.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { CreateListingDto } from '../../presentation/dto/create-listing.dto';
import { CreateTireDto } from '../../presentation/dto/create-tire.dto';
import { ListingVideoService } from '../../video/listing-video.service';
import { IListingCache, LISTING_CACHE } from '../ports/listing-cache.port';
import { IListingRepository, LISTING_REPOSITORY } from '../ports/listing.repository.port';
import {
  coverBlurHashFromImageBlurHashes,
  validateImageBlurHashesMatchImages,
} from '../utils/image-blur-hashes.utils';
import { buildListingSlugPart } from '../utils/listing-url-slug.utils';
import {
  assertPartnerListingCanonicalUrlShape,
  normalizePartnerListingCanonicalUrlInput,
} from '../utils/partner-listing-canonical-url.utils';

const CREATE_LISTING_EXCLUDED_FIELDS = [
  'vehicle',
  'tire',
  'assignedUserId',
  'description',
  'description_ro',
  'description_ru',
  'partner_source_code',
  'partner_listing_external_key',
  'partner_listing_canonical_url',
  'stagedVideoToken',
] as const;

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
    private readonly listingVideoService: ListingVideoService,
    @InjectRepository(TireModel)
    private readonly tireModelRepository: Repository<TireModel>,
    @InjectRepository(TireBrand)
    private readonly tireBrandRepository: Repository<TireBrand>,
  ) {}

  private sanitizeListingDescriptionHtml(value: string | undefined | null): string | null {
    if (value == null || typeof value !== 'string' || !value.trim()) {
      return null;
    }
    return normalizeDescriptionHtml(sanitizeHtml(value)) || null;
  }

  private resolveListingDescriptions(dto: CreateListingDto): {
    description_ro: string | null;
    description_ru: string | null;
    description: string | null;
  } {
    const roSource = dto.description_ro ?? dto.description;
    const description_ro = this.sanitizeListingDescriptionHtml(roSource);
    const description_ru = this.sanitizeListingDescriptionHtml(dto.description_ru);
    return {
      description_ro,
      description_ru,
      description: description_ro ?? description_ru ?? null,
    };
  }

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
      return this.executeTire(dto, ownerId, userId);
    }

    if (!dto.vehicle) {
      throw new BadRequestException('errors.vehiclePayloadRequired');
    }

    return this.executeVehicle(dto, ownerId, userType ?? '', userId);
  }

  private resolveStagedVideo(
    dto: CreateListingDto,
    requesterUserId: string,
  ): Promise<ListingVideoJson | null> {
    return this.listingVideoService.consumePublishedStagedVideo(
      dto.stagedVideoToken,
      requesterUserId,
    );
  }

  private async executeTire(
    dto: CreateListingDto,
    ownerId: string,
    requesterUserId: string,
  ): Promise<Listing> {
    const td = dto.tire as CreateTireDto;
    await this.assertTirePayloadValid(td);

    const brand = await this.tireBrandRepository.findOne({ where: { id: td.brand_id } });
    if (!brand || brand.is_archived) {
      throw new BadRequestException('errors.tireBrandNotFound');
    }

    const hasModelId = Boolean(td.model_id);

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
    }

    const status = dto.status || ListingStatusEnum.Active;
    const stagedVideo = await this.resolveStagedVideo(dto, requesterUserId);

    const blurHashesError = validateImageBlurHashesMatchImages(dto.image_blur_hashes, dto.images);
    if (blurHashesError) {
      throw new BadRequestException(blurHashesError);
    }

    const normalizedLoad = td.load_index?.trim() ? td.load_index.trim().toUpperCase() : null;
    const normalizedSpeed = td.speed_index?.trim() ? td.speed_index.trim().toUpperCase() : null;

    const tire = Object.assign(new Tire(), {
      brand_id: td.brand_id,
      model_id: hasModelId ? td.model_id! : null,
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
      width_mm: tire.width_mm,
      aspect_ratio: tire.aspect_ratio,
      diameter_inch: Number(tire.diameter_inch),
      load_index: tire.load_index,
      speed_index: tire.speed_index,
    });

    const listingFields = Object.fromEntries(
      Object.entries(dto).filter(
        ([key]) => !(CREATE_LISTING_EXCLUDED_FIELDS as readonly string[]).includes(key),
      ),
    ) as Omit<
      CreateListingDto,
      | 'vehicle'
      | 'tire'
      | 'assignedUserId'
      | 'description'
      | 'description_ro'
      | 'description_ru'
      | 'stagedVideoToken'
    >;

    const listing = new Listing();
    Object.assign(listing, {
      ...listingFields,
      ...this.resolveListingDescriptions(dto),
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
      availability: null,
      horsepower: null,
      power_kw: null,
      vin: null,
      equipment: null,
      is_new: false,
      available_in_credit: false,
      down_payment_amount: null,
      video: stagedVideo,
    });
    listing.tire = tire;
    listing.slug = buildListingSlugPart(title, listing.city);
    if (dto.image_blur_hashes != null) {
      listing.cover_blur_hash = coverBlurHashFromImageBlurHashes(dto.image_blur_hashes);
    }

    let saved: Listing;
    if (status === ListingStatusEnum.Active) {
      const limit = await this.usersService.getListingLimit(ownerId);
      saved = await this.listingRepo.saveWithActiveLimit(listing, ownerId, limit);
    } else {
      saved = await this.listingRepo.save(listing);
    }
    await this.listingCache.invalidateSearch();
    await this.listingCache.invalidateSimilar(saved.id);
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
    userType: string,
    requesterUserId: string,
  ): Promise<Listing> {
    const vehicle = Object.assign(new Vehicle(), dto.vehicle) as Vehicle;
    if (vehicle.fuel === 'Electric') vehicle.engine_displ_l = null;
    const title = await this.generateTitle(vehicle);

    const status = dto.status || ListingStatusEnum.Active;
    const stagedVideo = await this.resolveStagedVideo(dto, requesterUserId);

    const blurHashesError = validateImageBlurHashesMatchImages(dto.image_blur_hashes, dto.images);
    if (blurHashesError) {
      throw new BadRequestException(blurHashesError);
    }

    const partnerSource = dto.partner_source_code?.trim();
    const partnerKey = dto.partner_listing_external_key?.trim();
    const partnerCanonicalUrl = normalizePartnerListingCanonicalUrlInput(
      dto.partner_listing_canonical_url,
    );
    const hasPartnerSource = Boolean(partnerSource);
    const hasPartnerKey = Boolean(partnerKey);
    if (hasPartnerSource !== hasPartnerKey) {
      throw new BadRequestException('errors.partnerListingKeyPairRequired');
    }
    if (partnerCanonicalUrl) {
      if (userType !== 'Admin') {
        throw new ForbiddenException('errors.partnerListingKeyAdminOnly');
      }
      if (!hasPartnerSource || !hasPartnerKey || !partnerSource || !partnerKey) {
        throw new BadRequestException('errors.partnerListingCanonicalUrlRequiresPartnerKeys');
      }
      assertPartnerListingCanonicalUrlShape(partnerCanonicalUrl);
    }
    if (hasPartnerSource && hasPartnerKey && partnerSource && partnerKey) {
      if (userType !== 'Admin') {
        throw new ForbiddenException('errors.partnerListingKeyAdminOnly');
      }
      const taken = await this.listingRepo.findByPartnerListingKey(partnerSource, partnerKey);
      if (taken) {
        throw new BadRequestException('errors.partnerListingKeyInUse');
      }
    }

    const listingFields = Object.fromEntries(
      Object.entries(dto).filter(
        ([key]) => !(CREATE_LISTING_EXCLUDED_FIELDS as readonly string[]).includes(key),
      ),
    ) as Omit<
      CreateListingDto,
      | 'vehicle'
      | 'tire'
      | 'assignedUserId'
      | 'description'
      | 'description_ro'
      | 'description_ru'
      | 'stagedVideoToken'
    >;
    const listing = new Listing();
    Object.assign(listing, {
      ...listingFields,
      ...this.resolveListingDescriptions(dto),
      title,
      status,
      category: ListingCategory.Vehicle,
      currency: dto.currency || getDefaultCurrency(),
      user_id: ownerId,
      last_updated_at: new Date(),
      last_published_at: status === ListingStatusEnum.Active ? new Date() : null,
      tire_id: null,
      partner_source_code: partnerSource ?? null,
      partner_listing_external_key: partnerKey ?? null,
      partner_listing_canonical_url: partnerCanonicalUrl,
      is_parsed: hasPartnerSource && hasPartnerKey,
      video: stagedVideo,
    });
    if (!listing.available_in_credit) {
      listing.down_payment_amount = null;
    }
    listing.vehicle = vehicle;
    listing.slug = buildListingSlugPart(title, listing.city);
    if (dto.image_blur_hashes != null) {
      listing.cover_blur_hash = coverBlurHashFromImageBlurHashes(dto.image_blur_hashes);
    }

    let saved: Listing;
    if (status === ListingStatusEnum.Active) {
      const limit = await this.usersService.getListingLimit(ownerId);
      saved = await this.listingRepo.saveWithActiveLimit(listing, ownerId, limit);
    } else {
      saved = await this.listingRepo.save(listing);
    }
    await this.listingCache.invalidateSearch();
    await this.listingCache.invalidateSimilar(saved.id);
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
