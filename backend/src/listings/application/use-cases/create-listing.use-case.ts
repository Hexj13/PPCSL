import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { BrandsService } from '../../../brands/brands.service';
import { I18nService } from '../../../common/i18n/i18n.service';
import {
  Currency as CurrencyEnum,
  ListingStatus as ListingStatusEnum,
} from '../../../common/types';
import { normalizeDescriptionHtml, sanitizeHtml } from '../../../common/utils/html-sanitizer';
import { UsersService } from '../../../users/application/users.service';
import { ListingTitleService } from '../../domain/services/listing-title.service';
import { validateRegistrationDate } from '../../domain/utils/validation.utils';
import { Listing } from '../../entities/listing.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { CreateListingDto } from '../../presentation/dto/create-listing.dto';
import { IListingCache, LISTING_CACHE } from '../ports/listing-cache.port';
import { IListingRepository, LISTING_REPOSITORY } from '../ports/listing.repository.port';

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

  async execute(dto: CreateListingDto, userId: string): Promise<Listing> {
    validateRegistrationDate(dto.registration_expires_at);

    const vehicle = Object.assign(new Vehicle(), dto.vehicle);
    const title = await this.generateTitle(vehicle);

    const status = dto.status || ListingStatusEnum.Active;
    if (status === ListingStatusEnum.Active) {
      const activeCount = await this.listingRepo.countActiveByUser(userId);
      const limit = await this.usersService.getListingLimit(userId);
      if (activeCount >= limit) {
        throw new BadRequestException(`errors.activeListingsLimitExceeded|${limit}`);
      }
    }

    const listingFields = Object.fromEntries(
      Object.entries(dto).filter(([key]) => key !== 'vehicle'),
    ) as Omit<CreateListingDto, 'vehicle'>;
    const listing = new Listing();
    Object.assign(listing, {
      ...listingFields,
      description: dto.description
        ? normalizeDescriptionHtml(sanitizeHtml(dto.description)) || undefined
        : undefined,
      title,
      status,
      currency: dto.currency || CurrencyEnum.EUR,
      user_id: userId,
      last_updated_at: new Date(),
      last_published_at: status === ListingStatusEnum.Active ? new Date() : null,
      registration_expires_at: dto.registration_expires_at
        ? new Date(dto.registration_expires_at)
        : null,
    });
    listing.vehicle = vehicle;

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
              .then((models) => models.find((m) => m.id === modelId)?.vehicle_type ?? null)
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
