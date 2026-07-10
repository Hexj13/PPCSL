import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BODY_TYPES_BY_VEHICLE_TYPE, ListingCategory } from '../../../common/constants';
import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import {
  applyBooleanFilter,
  applyInOrEqualFilter,
  applyRangeFilter,
  applyTextSearchFilter,
} from '../../../common/utils/query-builder.utils';
import {
  IListingRepository,
  SearchCriteria,
  SimilarCandidatesCurrencyContext,
} from '../../application/ports/listing.repository.port';
import {
  approximatePriceInDefaultCurrency,
  buildListingRoundedPriceInDefaultCurrencySql,
  buildPriceInDefaultCurrencyOrderExpression,
} from '../../application/utils/price-sort.utils';
import {
  decodeSearchCursor,
  encodeSearchCursor,
} from '../../application/utils/search-cursor.utils';
import {
  POPULAR_BODY_TYPES_CAR,
  type PopularBodyTypeCar,
  type PopularListingsData,
  type PopularModelItem,
  type PopularStatBucket,
  type PopularStatItem,
} from '../../domain/popular-listings.types';
import { getVehicleTypeFromBodyType } from '../../domain/utils/vehicle-type.utils';
import { Listing } from '../../entities/listing.entity';
import { applyCitiesFilter } from '../utils/query-filters.utils';

import { applyListingCardSelects, getListingCardPage } from './listing-card-query.utils';
import { ACTIVELY_PROMOTED_SQL } from './listing-list-projection';

@Injectable()
export class TypeOrmListingRepository implements IListingRepository {
  constructor(
    @InjectRepository(Listing)
    private readonly repository: Repository<Listing>,
  ) {}

  async findById(id: string): Promise<Listing | null> {
    return this.repository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.brand', 'brand')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('listing.tire', 'tire')
      .leftJoinAndSelect('tire.brand', 'tireBrand')
      .leftJoinAndSelect('tire.model', 'tireModel')
      .leftJoinAndSelect('listing.user', 'user')
      .where('listing.id = :id', { id })
      .getOne();
  }

  async save(listing: Listing): Promise<Listing> {
    return this.repository.save(listing);
  }

  async search(
    criteria: SearchCriteria,
  ): Promise<{ data: Listing[]; total: number; nextCursor?: string }> {
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = criteria;
    const listCategory = criteria.category ?? 'vehicle';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const validSortFields =
      listCategory === 'tire'
        ? ['created_at', 'price', 'views']
        : ['created_at', 'price', 'year', 'views'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const dateSortColumn = sortField === 'created_at' ? 'last_updated_at' : sortField;

    const keysetColumn =
      sortField === 'created_at'
        ? 'listing.last_updated_at'
        : sortField === 'year' && listCategory !== 'tire'
          ? 'vehicle.year'
          : null;
    const cursorPayload = criteria.cursor ? decodeSearchCursor(criteria.cursor) : null;
    const useKeyset = keysetColumn !== null;
    const skip = useKeyset && cursorPayload ? 0 : (page - 1) * limit;

    return this.repository.manager.transaction('REPEATABLE READ', async (manager) => {
      const scopedRepository = manager.getRepository(Listing);

      const baseQb = this.buildSearchQuery(criteria, scopedRepository);
      const total =
        criteria.knownTotal !== undefined ? criteria.knownTotal : await baseQb.getCount();

      const queryBuilder = baseQb.clone();

      queryBuilder.addSelect(ACTIVELY_PROMOTED_SQL, 'actively_promoted');
      queryBuilder.orderBy('actively_promoted', 'DESC');
      if (dateSortColumn === 'year' && listCategory !== 'tire') {
        queryBuilder.addOrderBy('vehicle.year', order);
      } else if (dateSortColumn === 'views') {
        queryBuilder.addOrderBy('listing.views', order);
      } else if (
        dateSortColumn === 'price' &&
        criteria.defaultCurrency !== undefined &&
        criteria.priceSortRates !== undefined
      ) {
        const { expression, params } = buildPriceInDefaultCurrencyOrderExpression(
          criteria.defaultCurrency,
          criteria.priceSortRates,
        );
        for (const [key, value] of Object.entries(params)) {
          queryBuilder.setParameter(key, value);
        }
        queryBuilder.addSelect(expression, 'price_in_default_currency');
        queryBuilder.addOrderBy('price_in_default_currency', order);
      } else {
        queryBuilder.addOrderBy(`listing.${dateSortColumn}`, order);
      }
      queryBuilder.addOrderBy('listing.id', 'ASC');

      if (useKeyset && cursorPayload && keysetColumn) {
        const cmp = order === 'ASC' ? '>' : '<';
        const sortValue =
          keysetColumn === 'listing.last_updated_at'
            ? new Date(cursorPayload.sortValue)
            : cursorPayload.sortValue;
        queryBuilder.andWhere(
          `(${ACTIVELY_PROMOTED_SQL} < :cursorPromoted
            OR (${ACTIVELY_PROMOTED_SQL} = :cursorPromoted AND ${keysetColumn} ${cmp} :cursorSortValue)
            OR (${ACTIVELY_PROMOTED_SQL} = :cursorPromoted AND ${keysetColumn} = :cursorSortValue AND listing.id > :cursorId))`,
          {
            cursorPromoted: cursorPayload.promoted,
            cursorSortValue: sortValue,
            cursorId: cursorPayload.id,
          },
        );
      }

      const fetchLimit = useKeyset ? limit + 1 : limit;
      const data = await getListingCardPage(queryBuilder, skip, fetchLimit);
      let nextCursor: string | undefined;
      if (useKeyset && keysetColumn && data.length > limit) {
        const last = data[limit - 1];
        nextCursor = this.buildCursor(last, keysetColumn);
        data.splice(limit);
      }

      return { data, total, nextCursor };
    });
  }

  private buildCursor(listing: Listing, keysetColumn: string): string {
    const promoted =
      listing.is_promoted &&
      (listing.promoted_until === null ||
        listing.promoted_until === undefined ||
        new Date(listing.promoted_until).getTime() > Date.now())
        ? 1
        : 0;
    const sortValue =
      keysetColumn === 'listing.last_updated_at'
        ? listing.last_updated_at.toISOString()
        : ((listing.vehicle?.year ?? 0) as number);
    return encodeSearchCursor({ promoted, sortValue, id: listing.id });
  }

  async countActiveByUser(userId: string): Promise<number> {
    return this.repository.count({
      where: { user_id: userId, status: ListingStatusEnum.Active },
    });
  }

  async countPromotedByUser(userId: string): Promise<number> {
    return this.repository.count({
      where: {
        user_id: userId,
        status: ListingStatusEnum.Active,
        is_promoted: true,
      },
    });
  }

  async saveWithActiveLimit(listing: Listing, userId: string, limit: number): Promise<Listing> {
    return this.repository.manager.transaction('SERIALIZABLE', async (manager) => {
      const repo = manager.getRepository(Listing);
      const activeCount = await repo.count({
        where: { user_id: userId, status: ListingStatusEnum.Active },
      });
      if (activeCount >= limit) {
        throw new BadRequestException(`errors.activeListingsLimitExceeded|${limit}`);
      }
      return repo.save(listing);
    });
  }

  async findByVin(vin: string): Promise<Listing | null> {
    return this.repository.findOne({ where: { vin } });
  }

  async findByPartnerListingKey(
    partnerSourceCode: string,
    partnerListingExternalKey: string,
  ): Promise<Listing | null> {
    return this.repository.findOne({
      where: {
        partner_source_code: partnerSourceCode,
        partner_listing_external_key: partnerListingExternalKey,
      },
    });
  }

  async findSimilarCandidates(
    listing: Listing,
    currencyContext: SimilarCandidatesCurrencyContext,
  ): Promise<Listing[]> {
    if (listing.category === ListingCategory.Tire) {
      return this.findSimilarTireCandidates(listing, currencyContext);
    }

    const { vehicle } = listing;
    const { id: currentId } = listing;
    const body_type = vehicle?.body_type;
    const currentBrandId = vehicle?.brand_id ?? null;
    const currentModelId = vehicle?.model_id ?? null;
    const currentYear = vehicle?.year ?? null;
    const { defaultCurrency, rates } = currencyContext;
    const listingNorm = buildListingRoundedPriceInDefaultCurrencySql(defaultCurrency, rates);
    const currentPriceNormalized =
      listing.price != null && Number.isFinite(Number(listing.price))
        ? approximatePriceInDefaultCurrency(
            Number(listing.price),
            listing.currency,
            defaultCurrency,
            rates,
          )
        : null;
    const currentYearInt =
      currentYear != null && Number.isFinite(Number(currentYear))
        ? Math.round(Number(currentYear))
        : null;
    const yearDistanceSql =
      currentYearInt != null && currentYearInt >= 1900 && currentYearInt <= 2100
        ? `CASE WHEN vehicle.year IS NULL THEN 9999 ELSE ABS(vehicle.year - ${currentYearInt}) END`
        : '9999';
    const priceDistanceSql =
      currentPriceNormalized != null
        ? `CASE WHEN listing.price IS NULL THEN 999999999 ELSE ABS(${listingNorm.expression} - ${currentPriceNormalized}) END`
        : '999999999';
    let vehicle_type = vehicle?.model?.vehicle_types?.[0];

    if (!vehicle_type && body_type) {
      vehicle_type = getVehicleTypeFromBodyType(body_type);
    }

    const queryBuilder = this.repository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.brand', 'brand')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('listing.user', 'user')
      .where('listing.status = :status', { status: ListingStatusEnum.Active })
      .andWhere('listing.id != :currentId', { currentId });

    if (vehicle_type) {
      const key = vehicle_type as 'car' | 'truck' | 'moto';
      queryBuilder.andWhere('vehicle.body_type IN (:...bodyTypes)', {
        bodyTypes: BODY_TYPES_BY_VEHICLE_TYPE[key],
      });
    }

    queryBuilder
      .addSelect(
        'CASE WHEN vehicle.brand_id = CAST(:currentBrandId AS uuid) AND vehicle.model_id = CAST(:currentModelId AS uuid) THEN 0 ELSE 1 END',
        'same_model_priority',
      )
      .addSelect(
        'CASE WHEN CAST(:currentBrandId AS uuid) IS NULL OR CAST(:currentBodyType AS text) IS NULL THEN 1 WHEN vehicle.brand_id = CAST(:currentBrandId AS uuid) AND vehicle.body_type::text = CAST(:currentBodyType AS text) THEN 0 ELSE 1 END',
        'same_brand_body_priority',
      )
      .addSelect(yearDistanceSql, 'year_distance')
      .addSelect(priceDistanceSql, 'price_distance')
      .setParameters({
        ...listingNorm.params,
        currentBrandId,
        currentModelId,
        currentBodyType: body_type ?? null,
      })
      .orderBy('same_model_priority', 'ASC')
      .addOrderBy('same_brand_body_priority', 'ASC')
      .addOrderBy('year_distance', 'ASC')
      .addOrderBy('price_distance', 'ASC')
      .addOrderBy('listing.last_updated_at', 'DESC')
      .limit(80);

    return queryBuilder.getMany();
  }

  private async findSimilarTireCandidates(
    listing: Listing,
    currencyContext: SimilarCandidatesCurrencyContext,
  ): Promise<Listing[]> {
    const tire = listing.tire;
    if (!tire) {
      return [];
    }

    const { id: currentId } = listing;
    const { defaultCurrency, rates } = currencyContext;
    const listingNorm = buildListingRoundedPriceInDefaultCurrencySql(defaultCurrency, rates);
    const currentPriceNormalized =
      listing.price != null && Number.isFinite(Number(listing.price))
        ? approximatePriceInDefaultCurrency(
            Number(listing.price),
            listing.currency,
            defaultCurrency,
            rates,
          )
        : null;
    const priceDistanceSql =
      currentPriceNormalized != null
        ? `CASE WHEN listing.price IS NULL THEN 999999999 ELSE ABS(${listingNorm.expression} - ${currentPriceNormalized}) END`
        : '999999999';

    const sizeMatchSql = `CASE WHEN tire.width_mm = :tw AND tire.aspect_ratio = :tar AND tire.diameter_inch = :td THEN 0 ELSE 1 END`;
    const brandModelPrioritySql =
      tire.model_id != null
        ? `CASE WHEN tire.brand_id = CAST(:tbid AS uuid) AND tire.model_id = CAST(:tmid AS uuid) THEN 0 ELSE 1 END`
        : `CASE WHEN tire.brand_id = CAST(:tbid AS uuid) THEN 0 ELSE 1 END`;
    const seasonPrioritySql = `CASE WHEN tire.season = :tseason THEN 0 ELSE 1 END`;
    const tireCondPrioritySql = `CASE WHEN tire.condition = :tireCond THEN 0 ELSE 1 END`;

    const params: Record<string, string | number | boolean> = {
      ...listingNorm.params,
      tw: tire.width_mm,
      tar: tire.aspect_ratio,
      td: Number(tire.diameter_inch),
      tbid: tire.brand_id,
      tseason: tire.season,
      tireCond: tire.condition,
    };
    if (tire.model_id != null) {
      params.tmid = tire.model_id;
    }

    const buildTireSimilarQuery = (restrictVehicleType: boolean) => {
      const qb = this.repository
        .createQueryBuilder('listing')
        .leftJoinAndSelect('listing.tire', 'tire')
        .leftJoinAndSelect('tire.brand', 'tireBrand')
        .leftJoinAndSelect('tire.model', 'tireModel')
        .leftJoinAndSelect('listing.user', 'user')
        .where('listing.status = :status', { status: ListingStatusEnum.Active })
        .andWhere('listing.id != :currentId', { currentId })
        .andWhere('listing.category = :tireCategory', { tireCategory: ListingCategory.Tire })
        .addSelect(sizeMatchSql, 'size_match_priority')
        .addSelect(brandModelPrioritySql, 'brand_model_priority')
        .addSelect(seasonPrioritySql, 'season_priority')
        .addSelect(tireCondPrioritySql, 'tire_cond_priority')
        .addSelect(priceDistanceSql, 'price_distance')
        .orderBy('size_match_priority', 'ASC')
        .addOrderBy('brand_model_priority', 'ASC')
        .addOrderBy('season_priority', 'ASC')
        .addOrderBy('tire_cond_priority', 'ASC')
        .addOrderBy('price_distance', 'ASC')
        .addOrderBy('listing.last_updated_at', 'DESC')
        .limit(200)
        .setParameters(params);
      if (restrictVehicleType) {
        qb.andWhere('tire.tire_vehicle_type = :tireVehType', {
          tireVehType: tire.tire_vehicle_type,
        });
      }
      return qb;
    };

    const strict = await buildTireSimilarQuery(true).getMany();
    if (strict.length > 0) {
      return strict;
    }
    return buildTireSimilarQuery(false).getMany();
  }

  private buildSearchQuery(
    searchDto: SearchCriteria,
    repository: Repository<Listing> = this.repository,
  ) {
    const cat = searchDto.category ?? 'vehicle';
    if (cat === 'tire') {
      return this.buildTireSearchQuery(searchDto, repository);
    }
    return this.buildVehicleSearchQuery(searchDto, repository);
  }

  private buildVehicleSearchQuery(
    searchDto: SearchCriteria,
    repository: Repository<Listing> = this.repository,
  ) {
    const qb = applyListingCardSelects(repository.createQueryBuilder('listing'))
      .where('listing.status = :status', { status: ListingStatusEnum.Active })
      .andWhere('listing.category = :vehicleListCategory', {
        vehicleListCategory: ListingCategory.Vehicle,
      });

    this.applyBrandModelFilter(qb, searchDto);

    if (searchDto.vehicleType) {
      qb.andWhere('vehicle.body_type IN (:...bodyTypes)', {
        bodyTypes: BODY_TYPES_BY_VEHICLE_TYPE[searchDto.vehicleType],
      });
    }

    applyRangeFilter(qb, 'vehicle', 'year', searchDto.year_gte, searchDto.year_lte);
    applyRangeFilter(qb, 'listing', 'price', searchDto.price_gte, searchDto.price_lte);
    applyRangeFilter(qb, 'vehicle', 'mileage_km', searchDto.mileage_gte, searchDto.mileage_lte);
    applyRangeFilter(
      qb,
      'vehicle',
      'engine_displ_l',
      searchDto.engine_displ_l_gte,
      searchDto.engine_displ_l_lte,
    );
    applyRangeFilter(
      qb,
      'listing',
      'horsepower',
      searchDto.horsepower_gte,
      searchDto.horsepower_lte,
    );

    applyCitiesFilter(qb, 'listing', searchDto.cities, searchDto.city);

    applyInOrEqualFilter(qb, 'vehicle', 'fuel', searchDto.fuels, searchDto.fuel);
    applyInOrEqualFilter(
      qb,
      'vehicle',
      'transmission',
      searchDto.transmissions,
      searchDto.transmission,
    );
    if (searchDto.body_types && searchDto.body_types.length > 0) {
      qb.andWhere('vehicle.body_type IN (:...bodyTypes)', {
        bodyTypes: searchDto.body_types,
      });
    } else if (searchDto.body_type) {
      qb.andWhere('vehicle.body_type = :bodyType', { bodyType: searchDto.body_type });
    }
    applyInOrEqualFilter(qb, 'vehicle', 'color', searchDto.colors, searchDto.color);

    if (searchDto.vehicleType !== 'moto') {
      applyInOrEqualFilter(qb, 'vehicle', 'drive_type', searchDto.drive_types, undefined);
      if (searchDto.doors && searchDto.doors.length > 0) {
        const doorNumbers = searchDto.doors.map((d) => parseInt(d, 10)).filter((d) => !isNaN(d));
        if (doorNumbers.length > 0) {
          qb.andWhere('vehicle.doors IN (:...doors)', { doors: doorNumbers });
        }
      } else if (searchDto.doors_single) {
        qb.andWhere('vehicle.doors = :doors', { doors: searchDto.doors_single });
      }
    }

    if (searchDto.currency) {
      qb.andWhere('listing.currency = :currency', { currency: searchDto.currency });
    }

    applyTextSearchFilter(qb, 'listing', 'title', searchDto.title);
    applyBooleanFilter(qb, 'listing', 'urgent', searchDto.urgent);
    applyBooleanFilter(qb, 'listing', 'is_new', searchDto.is_new);
    applyBooleanFilter(qb, 'listing', 'available_in_credit', searchDto.available_in_credit);
    if (searchDto.seller_type) {
      qb.andWhere('user.type = :sellerType', { sellerType: searchDto.seller_type });
    }
    if (searchDto.down_payment_amount_gte != null && searchDto.down_payment_amount_gte >= 0) {
      qb.andWhere(
        'listing.available_in_credit = true AND listing.down_payment_amount IS NOT NULL AND listing.down_payment_amount >= :down_payment_amount_gte',
        { down_payment_amount_gte: searchDto.down_payment_amount_gte },
      );
    }

    if (searchDto.conditions && searchDto.conditions.length > 0) {
      qb.andWhere('listing.condition IN (:...conditions)', {
        conditions: searchDto.conditions,
      });
    }

    if (searchDto.registration_types && searchDto.registration_types.length > 0) {
      qb.andWhere('listing.registration_type IN (:...registration_types)', {
        registration_types: searchDto.registration_types,
      });
    }

    if (searchDto.equipment && searchDto.equipment.length > 0) {
      const isPartial = searchDto.equipmentMatch === 'partial';
      if (isPartial) {
        const orConditions = searchDto.equipment
          .map((_, index) => `listing.equipment LIKE :equip_${index}`)
          .join(' OR ');
        const params: Record<string, string> = {};
        searchDto.equipment.forEach((key, index) => {
          params[`equip_${index}`] = `%${key}%`;
        });
        qb.andWhere(`(${orConditions})`, params);
      } else {
        searchDto.equipment.forEach((key, index) => {
          qb.andWhere(`listing.equipment LIKE :equip_${index}`, {
            [`equip_${index}`]: `%${key}%`,
          });
        });
      }
    }

    qb.andWhere(
      '(listing.is_promoted = false OR listing.promoted_until IS NULL OR listing.promoted_until > NOW())',
    );

    return qb;
  }

  private buildTireSearchQuery(
    searchDto: SearchCriteria,
    repository: Repository<Listing> = this.repository,
  ) {
    const qb = repository
      .createQueryBuilder('listing')
      .select([
        'listing.id',
        'listing.title',
        'listing.price',
        'listing.currency',
        'listing.city',
        'listing.status',
        'listing.images',
        'listing.cover_blur_hash',
        'listing.urgent',
        'listing.is_new',
        'listing.is_promoted',
        'listing.promoted_until',
        'listing.views',
        'listing.condition',
        'listing.registration_type',
        'listing.equipment',
        'listing.category',
        'listing.created_at',
        'listing.last_updated_at',
        'listing.slug',
        'listing.video',
      ])
      .leftJoin('listing.tire', 'tire')
      .addSelect([
        'tire.id',
        'tire.brand_id',
        'tire.model_id',
        'tire.tire_vehicle_type',
        'tire.season',
        'tire.condition',
        'tire.width_mm',
        'tire.aspect_ratio',
        'tire.diameter_inch',
        'tire.quantity',
        'tire.studded',
        'tire.run_flat',
        'tire.reinforced_xl',
        'tire.spare_donut',
        'tire.tubeless',
        'tire.acoustic',
      ])
      .leftJoin('tire.brand', 'tireBrand')
      .addSelect(['tireBrand.id', 'tireBrand.name', 'tireBrand.logoUrl'])
      .leftJoin('tire.model', 'tireModel')
      .addSelect(['tireModel.id', 'tireModel.name', 'tireModel.is_other'])
      .leftJoin('listing.user', 'user')
      .addSelect([
        'user.id',
        'user.type',
        'user.phone',
        'user.firstName',
        'user.lastName',
        'user.companyName',
        'user.companyWebsiteUrl',
      ])
      .where('listing.status = :status', { status: ListingStatusEnum.Active })
      .andWhere('listing.category = :tireListCategory', {
        tireListCategory: ListingCategory.Tire,
      });

    if (searchDto.tireVehicleType) {
      qb.andWhere('tire.tire_vehicle_type = :tireVehType', {
        tireVehType: searchDto.tireVehicleType,
      });
    }

    this.applyTireBrandModelFilter(qb, searchDto);

    this.applyTireDimensionFilters(qb, searchDto);
    if (searchDto.tire_seasons && searchDto.tire_seasons.length > 0) {
      qb.andWhere('tire.season IN (:...tireSeasons)', { tireSeasons: searchDto.tire_seasons });
    }
    if (searchDto.tire_conditions && searchDto.tire_conditions.length > 0) {
      qb.andWhere('tire.condition IN (:...tireConditions)', {
        tireConditions: searchDto.tire_conditions,
      });
    }
    if (searchDto.tire_quantities && searchDto.tire_quantities.length > 0) {
      qb.andWhere('tire.quantity IN (:...tireQty)', { tireQty: searchDto.tire_quantities });
    }

    applyBooleanFilter(qb, 'tire', 'studded', searchDto.tire_studded);
    applyBooleanFilter(qb, 'tire', 'run_flat', searchDto.tire_run_flat);
    applyBooleanFilter(qb, 'tire', 'reinforced_xl', searchDto.tire_reinforced_xl);
    applyBooleanFilter(qb, 'tire', 'spare_donut', searchDto.tire_spare_donut);
    applyBooleanFilter(qb, 'tire', 'tubeless', searchDto.tire_tubeless);
    applyBooleanFilter(qb, 'tire', 'acoustic', searchDto.tire_acoustic);

    applyRangeFilter(qb, 'listing', 'price', searchDto.price_gte, searchDto.price_lte);
    applyCitiesFilter(qb, 'listing', searchDto.cities, searchDto.city);

    if (searchDto.currency) {
      qb.andWhere('listing.currency = :currency', { currency: searchDto.currency });
    }

    applyTextSearchFilter(qb, 'listing', 'title', searchDto.title);
    applyBooleanFilter(qb, 'listing', 'urgent', searchDto.urgent);
    applyBooleanFilter(qb, 'listing', 'is_new', searchDto.is_new);
    if (searchDto.seller_type) {
      qb.andWhere('user.type = :sellerType', { sellerType: searchDto.seller_type });
    }

    qb.andWhere(
      '(listing.is_promoted = false OR listing.promoted_until IS NULL OR listing.promoted_until > NOW())',
    );

    return qb;
  }

  private applyTireDimensionFilters(
    qb: ReturnType<Repository<Listing>['createQueryBuilder']>,
    searchDto: SearchCriteria,
  ): void {
    const w = searchDto.tire_widths;
    const p = searchDto.tire_profiles;
    const d = searchDto.tire_diameters;
    const lenW = w?.length ?? 0;
    const lenP = p?.length ?? 0;
    const lenD = d?.length ?? 0;
    if (lenW > 0 && lenW === lenP && lenP === lenD) {
      const parts: string[] = [];
      const params: Record<string, number> = {};
      w!.forEach((tw, i) => {
        const s = `i${i}`;
        parts.push(
          `(tire.width_mm = :taw${s} AND tire.aspect_ratio = :tap${s} AND tire.diameter_inch = :tad${s})`,
        );
        params[`taw${s}`] = tw;
        params[`tap${s}`] = p![i];
        params[`tad${s}`] = d![i];
      });
      qb.andWhere(`(${parts.join(' OR ')})`, params);
      return;
    }
    if (w && w.length > 0) {
      qb.andWhere('tire.width_mm IN (:...tireWidths)', { tireWidths: w });
    }
    if (p && p.length > 0) {
      qb.andWhere('tire.aspect_ratio IN (:...tireProfiles)', { tireProfiles: p });
    }
    if (d && d.length > 0) {
      const placeholders = d.map((_, i) => `:tdia${i}`).join(', ');
      const diaParams: Record<string, number> = {};
      d.forEach((dia, i) => {
        diaParams[`tdia${i}`] = dia;
      });
      qb.andWhere(`tire.diameter_inch IN (${placeholders})`, diaParams);
    }
  }

  private applyTireBrandModelFilter(
    qb: ReturnType<Repository<Listing>['createQueryBuilder']>,
    searchDto: SearchCriteria,
  ): void {
    const bids = searchDto.tire_brand_ids;
    const mids = searchDto.tire_model_ids;
    const hasB = bids && bids.length > 0;
    const hasM = mids && mids.length > 0;
    if (hasB && hasM) {
      qb.andWhere('tire.model_id IN (:...tireModelIds) AND tire.brand_id IN (:...tireBrandIds)', {
        tireModelIds: mids,
        tireBrandIds: bids,
      });
    } else if (hasM) {
      qb.andWhere('tire.model_id IN (:...tireModelIdsOnly)', { tireModelIdsOnly: mids });
    } else if (hasB) {
      qb.andWhere('tire.brand_id IN (:...tireBrandIdsOnly)', { tireBrandIdsOnly: bids });
    }
  }

  private applyBrandModelFilter(
    qb: ReturnType<Repository<Listing>['createQueryBuilder']>,
    searchDto: SearchCriteria,
  ): void {
    const hasBrandIds = searchDto.brand_ids && searchDto.brand_ids.length > 0;
    const hasModelIds = searchDto.model_ids && searchDto.model_ids.length > 0;

    if (hasBrandIds && hasModelIds) {
      qb.andWhere(
        '(vehicle.model_id IN (:...bm_model_ids) OR ' +
          '(vehicle.brand_id IN (:...bm_brand_ids) AND vehicle.brand_id NOT IN ' +
          '(SELECT DISTINCT vm.brand_id FROM vehicle_models vm WHERE vm.id IN (:...bm_model_ids_sub))))',
        {
          bm_model_ids: searchDto.model_ids,
          bm_brand_ids: searchDto.brand_ids,
          bm_model_ids_sub: searchDto.model_ids,
        },
      );
    } else {
      applyInOrEqualFilter(qb, 'vehicle', 'brand_id', searchDto.brand_ids, searchDto.brand_id);
      applyInOrEqualFilter(qb, 'vehicle', 'model_id', searchDto.model_ids, searchDto.model_id);
    }
  }

  async getPopularListingsAggregates(): Promise<Omit<PopularListingsData, 'generatedAt'>> {
    const carBodyTypes = [...BODY_TYPES_BY_VEHICLE_TYPE.car];
    const popularBodyTypes = [...POPULAR_BODY_TYPES_CAR];

    type ModelRow = {
      body_type: string;
      brand_id: string;
      brand_name: string;
      model_id: string;
      model_name: string;
      listing_count: string;
    };
    type StatRow = {
      key: string;
      label: string;
      count: string;
    };

    const [modelRows, brandRows, bodyTypeRows, fuelRows] = await Promise.all([
      this.repository.manager.query(
        `
        WITH active_vehicle_listings AS (
          SELECT
            l.id,
            v.body_type::text AS body_type,
            v.brand_id,
            v.model_id,
            b.name AS brand_name,
            vm.name AS model_name
          FROM listings l
          INNER JOIN vehicles v ON v.id = l.vehicle_id
          INNER JOIN brands b ON b.id = v.brand_id
          INNER JOIN vehicle_models vm ON vm.id = v.model_id
          WHERE l.status = 'Active'
            AND l.category = 'vehicle'
            AND v.body_type::text = ANY($1)
            AND (l.is_promoted = false OR l.promoted_until IS NULL OR l.promoted_until > NOW())
            AND b.is_archived = false
            AND vm.is_archived = false
        ),
        model_counts AS (
          SELECT
            body_type,
            brand_id,
            brand_name,
            model_id,
            model_name,
            COUNT(*)::int AS listing_count
          FROM active_vehicle_listings
          WHERE body_type = ANY($2)
          GROUP BY body_type, brand_id, brand_name, model_id, model_name
        ),
        ranked AS (
          SELECT
            *,
            ROW_NUMBER() OVER (
              PARTITION BY body_type
              ORDER BY listing_count DESC, brand_name ASC, model_name ASC
            ) AS rn
          FROM model_counts
        )
        SELECT body_type, brand_id, brand_name, model_id, model_name, listing_count
        FROM ranked
        WHERE rn <= 8
        ORDER BY body_type ASC, rn ASC
        `,
        [carBodyTypes, popularBodyTypes],
      ) as Promise<ModelRow[]>,
      this.repository.manager.query(
        `
        WITH active_vehicle_listings AS (
          SELECT
            l.id,
            v.brand_id,
            b.name AS brand_name
          FROM listings l
          INNER JOIN vehicles v ON v.id = l.vehicle_id
          INNER JOIN brands b ON b.id = v.brand_id
          INNER JOIN vehicle_models vm ON vm.id = v.model_id
          WHERE l.status = 'Active'
            AND l.category = 'vehicle'
            AND v.body_type::text = ANY($1)
            AND (l.is_promoted = false OR l.promoted_until IS NULL OR l.promoted_until > NOW())
            AND b.is_archived = false
            AND vm.is_archived = false
        )
        SELECT brand_id::text AS key, brand_name AS label, COUNT(*)::int AS count
        FROM active_vehicle_listings
        GROUP BY brand_id, brand_name
        ORDER BY count DESC, brand_name ASC
        `,
        [carBodyTypes],
      ) as Promise<StatRow[]>,
      this.repository.manager.query(
        `
        WITH active_vehicle_listings AS (
          SELECT
            l.id,
            v.body_type::text AS body_type
          FROM listings l
          INNER JOIN vehicles v ON v.id = l.vehicle_id
          INNER JOIN brands b ON b.id = v.brand_id
          INNER JOIN vehicle_models vm ON vm.id = v.model_id
          WHERE l.status = 'Active'
            AND l.category = 'vehicle'
            AND v.body_type::text = ANY($1)
            AND (l.is_promoted = false OR l.promoted_until IS NULL OR l.promoted_until > NOW())
            AND b.is_archived = false
            AND vm.is_archived = false
        )
        SELECT body_type AS key, body_type AS label, COUNT(*)::int AS count
        FROM active_vehicle_listings
        GROUP BY body_type
        ORDER BY count DESC, body_type ASC
        `,
        [carBodyTypes],
      ) as Promise<StatRow[]>,
      this.repository.manager.query(
        `
        WITH active_vehicle_listings AS (
          SELECT
            l.id,
            COALESCE(v.fuel::text, 'unknown') AS fuel_key
          FROM listings l
          INNER JOIN vehicles v ON v.id = l.vehicle_id
          INNER JOIN brands b ON b.id = v.brand_id
          INNER JOIN vehicle_models vm ON vm.id = v.model_id
          WHERE l.status = 'Active'
            AND l.category = 'vehicle'
            AND v.body_type::text = ANY($1)
            AND (l.is_promoted = false OR l.promoted_until IS NULL OR l.promoted_until > NOW())
            AND b.is_archived = false
            AND vm.is_archived = false
        )
        SELECT fuel_key AS key, fuel_key AS label, COUNT(*)::int AS count
        FROM active_vehicle_listings
        GROUP BY fuel_key
        ORDER BY count DESC, fuel_key ASC
        `,
        [carBodyTypes],
      ) as Promise<StatRow[]>,
    ]);

    const modelsByBodyType = Object.fromEntries(
      POPULAR_BODY_TYPES_CAR.map((bodyType) => [bodyType, [] as PopularModelItem[]]),
    ) as Record<PopularBodyTypeCar, PopularModelItem[]>;

    for (const row of modelRows) {
      const bodyType = row.body_type as PopularBodyTypeCar;
      if (!(bodyType in modelsByBodyType)) continue;
      modelsByBodyType[bodyType].push({
        brandId: row.brand_id,
        brandName: row.brand_name,
        modelId: row.model_id,
        modelName: row.model_name,
        listingCount: Number(row.listing_count),
      });
    }

    return {
      modelsByBodyType,
      brandListingCounts: Object.fromEntries(
        brandRows.map((row) => [row.label, Number(row.count)]),
      ),
      statistics: {
        brands: this.toPopularStatBucket(brandRows),
        bodyTypes: this.toPopularStatBucket(bodyTypeRows),
        fuels: this.toPopularStatBucket(fuelRows),
      },
    };
  }

  private toPopularStatBucket(
    rows: Array<{ key: string; label: string; count: string | number }>,
  ): PopularStatBucket {
    const parsed: PopularStatItem[] = rows
      .map((row) => ({
        key: row.key,
        label: row.label,
        count: Number(row.count),
      }))
      .filter((item) => item.count > 0);
    const total = parsed.reduce((sum, item) => sum + item.count, 0);
    const items = parsed.slice(0, 4);
    const otherCount = parsed.slice(4).reduce((sum, item) => sum + item.count, 0);
    return { items, otherCount, total };
  }
}
