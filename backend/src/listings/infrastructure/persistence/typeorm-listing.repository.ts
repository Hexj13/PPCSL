import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BODY_TYPES_BY_VEHICLE_TYPE } from '../../../common/constants';
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
import { getVehicleTypeFromBodyType } from '../../domain/utils/vehicle-type.utils';
import { Listing } from '../../entities/listing.entity';
import { applyCitiesFilter } from '../utils/query-filters.utils';

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
      .leftJoinAndSelect('listing.user', 'user')
      .where('listing.id = :id', { id })
      .getOne();
  }

  async save(listing: Listing): Promise<Listing> {
    return this.repository.save(listing);
  }

  async search(criteria: SearchCriteria): Promise<{ data: Listing[]; total: number }> {
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = criteria;
    const skip = (page - 1) * limit;

    return this.repository.manager.transaction('REPEATABLE READ', async (manager) => {
      const scopedRepository = manager.getRepository(Listing);

      const countQb = this.buildSearchQuery(criteria, scopedRepository);
      const total = await countQb.getCount();

      const queryBuilder = this.buildSearchQuery(criteria, scopedRepository);
      const validSortFields = ['created_at', 'price', 'year', 'views'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dateSortColumn = sortField === 'created_at' ? 'last_updated_at' : sortField;

      queryBuilder.addSelect(
        `(CASE WHEN listing.is_promoted = true AND (listing.promoted_until IS NULL OR listing.promoted_until > NOW()) THEN 1 ELSE 0 END)`,
        'actively_promoted',
      );
      queryBuilder.orderBy('actively_promoted', 'DESC');
      if (dateSortColumn === 'year') {
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

      const data = await queryBuilder.skip(skip).take(limit).getMany();
      return { data, total };
    });
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

  async findByVin(vin: string): Promise<Listing | null> {
    return this.repository.findOne({ where: { vin } });
  }

  async findSimilarCandidates(
    listing: Listing,
    currencyContext: SimilarCandidatesCurrencyContext,
  ): Promise<Listing[]> {
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
      .limit(200);

    return queryBuilder.getMany();
  }

  private buildSearchQuery(
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
        'listing.created_at',
        'listing.last_updated_at',
      ])
      .leftJoin('listing.vehicle', 'vehicle')
      .addSelect([
        'vehicle.id',
        'vehicle.year',
        'vehicle.fuel',
        'vehicle.transmission',
        'vehicle.mileage_km',
        'vehicle.body_type',
        'vehicle.engine_displ_l',
        'vehicle.color',
        'vehicle.doors',
        'vehicle.drive_type',
      ])
      .leftJoin('vehicle.brand', 'brand')
      .addSelect(['brand.id', 'brand.name', 'brand.logoUrl'])
      .leftJoin('vehicle.model', 'model')
      .addSelect(['model.id', 'model.name', 'model.vehicle_types'])
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
      .where('listing.status = :status', { status: ListingStatusEnum.Active });

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
}
