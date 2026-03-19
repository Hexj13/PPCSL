import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { BrandsService } from '../../../brands/brands.service';
import { getDefaultCurrency } from '../../../common/constants';
import { I18nService } from '../../../common/i18n/i18n.service';
import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { normalizeDescriptionHtml, sanitizeHtml } from '../../../common/utils/html-sanitizer';
import { UsersService } from '../../../users/application/users.service';
import { ListingTitleService } from '../../domain/services/listing-title.service';
import { Listing } from '../../entities/listing.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { CreateListingDto } from '../../presentation/dto/create-listing.dto';
import { IListingCache, LISTING_CACHE } from '../ports/listing-cache.port';
import { IListingRepository, LISTING_REPOSITORY } from '../ports/listing.repository.port';
import {
  coverBlurHashFromImageBlurHashes,
  validateImageBlurHashesMatchImages,
} from '../utils/image-blur-hashes.utils';

@Injectable()
export class CreateListingUseCase {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
    private readonly titleService: ListingTitleService,
    private readonly usersService: UsersService,
    private readonly brandsService: BrandsService,
    private readonly i18nService: I18nService,
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
      Object.entries(dto).filter(([key]) => !['vehicle', 'assignedUserId'].includes(key)),
    ) as Omit<CreateListingDto, 'vehicle' | 'assignedUserId'>;
    const listing = new Listing();
    Object.assign(listing, {
      ...listingFields,
      description: dto.description
        ? normalizeDescriptionHtml(sanitizeHtml(dto.description)) || undefined
        : undefined,
      title,
      status,
      currency: dto.currency || getDefaultCurrency(),
      user_id: ownerId,
      last_updated_at: new Date(),
      last_published_at: status === ListingStatusEnum.Active ? new Date() : null,
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
