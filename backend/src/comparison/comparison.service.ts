import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { ListingCategory } from '../common/constants';
import { logUserEvent } from '../common/utils/log-user-event';
import { Listing } from '../listings/entities/listing.entity';

import { ComparisonItem } from './entities/comparison-item.entity';

const MAX_PER_BUCKET = 3;

function normalizeOrderedIds(ids: string[] | undefined, max: number): string[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

function mergeBuckets(serverOrdered: string[], guestOrdered: string[]): string[] {
  const result = [...serverOrdered];
  for (const id of guestOrdered) {
    if (result.includes(id)) continue;
    if (result.length >= MAX_PER_BUCKET) break;
    result.push(id);
  }
  return result;
}

@Injectable()
export class ComparisonService {
  private readonly logger = new Logger(ComparisonService.name);

  constructor(
    @InjectRepository(ComparisonItem)
    private readonly comparisonRepository: Repository<ComparisonItem>,
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
  ) {}

  async getListingIdsGrouped(userId: string): Promise<{
    vehicleListingIds: string[];
    tireListingIds: string[];
  }> {
    const items = await this.comparisonRepository
      .createQueryBuilder('ci')
      .innerJoinAndSelect('ci.listing', 'listing')
      .where('ci.user_id = :userId', { userId })
      .orderBy('ci.created_at', 'ASC')
      .addOrderBy('ci.id', 'ASC')
      .getMany();

    const vehicleListingIds: string[] = [];
    const tireListingIds: string[] = [];
    for (const row of items) {
      if (!row.listing) continue;
      if (row.listing.category === ListingCategory.Tire) {
        tireListingIds.push(row.listing_id);
      } else {
        vehicleListingIds.push(row.listing_id);
      }
    }
    return { vehicleListingIds, tireListingIds };
  }

  async add(userId: string, listingId: string): Promise<ComparisonItem> {
    const listing = await this.listingsRepository.findOne({
      where: { id: listingId },
      select: ['id', 'category'],
    });

    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }

    const existing = await this.comparisonRepository.findOne({
      where: { user_id: userId, listing_id: listingId },
    });

    if (existing) {
      return existing;
    }

    const inBucket = await this.countInCategory(userId, listing.category);
    if (inBucket >= MAX_PER_BUCKET) {
      throw new BadRequestException(
        listing.category === ListingCategory.Tire
          ? 'errors.comparisonLimitTireReached'
          : 'errors.comparisonLimitVehicleReached',
      );
    }

    const created = this.comparisonRepository.create({
      user_id: userId,
      listing_id: listingId,
    });
    const saved = await this.comparisonRepository.save(created);
    logUserEvent(this.logger, {
      event: 'comparison_added',
      userId,
      listingId,
    });
    return saved;
  }

  async remove(userId: string, listingId: string): Promise<void> {
    const result = await this.comparisonRepository.delete({
      user_id: userId,
      listing_id: listingId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('errors.comparisonNotFound');
    }
    logUserEvent(this.logger, {
      event: 'comparison_removed',
      userId,
      listingId,
    });
  }

  async sync(
    userId: string,
    vehicleListingIds: string[],
    tireListingIds: string[],
  ): Promise<{ vehicleListingIds: string[]; tireListingIds: string[] }> {
    const guestVehicles = normalizeOrderedIds(vehicleListingIds, MAX_PER_BUCKET);
    const guestTires = normalizeOrderedIds(tireListingIds, MAX_PER_BUCKET);

    const validatedVehicles = await this.filterIdsByCategory(
      guestVehicles,
      ListingCategory.Vehicle,
    );
    const validatedTires = await this.filterIdsByCategory(guestTires, ListingCategory.Tire);

    const current = await this.getListingIdsGrouped(userId);
    const mergedVehicle = mergeBuckets(current.vehicleListingIds, validatedVehicles);
    const mergedTire = mergeBuckets(current.tireListingIds, validatedTires);

    let tick = Date.now();
    await this.comparisonRepository.manager.transaction(async (em) => {
      await em.delete(ComparisonItem, { user_id: userId });
      for (const listingId of mergedVehicle) {
        tick += 1;
        await em.insert(ComparisonItem, {
          user_id: userId,
          listing_id: listingId,
          created_at: new Date(tick),
        });
      }
      for (const listingId of mergedTire) {
        tick += 1;
        await em.insert(ComparisonItem, {
          user_id: userId,
          listing_id: listingId,
          created_at: new Date(tick),
        });
      }
    });

    logUserEvent(this.logger, {
      event: 'comparison_synced',
      userId,
      vehicleCount: mergedVehicle.length,
      tireCount: mergedTire.length,
    });

    return {
      vehicleListingIds: mergedVehicle,
      tireListingIds: mergedTire,
    };
  }

  private async countInCategory(userId: string, category: string): Promise<number> {
    const row = await this.comparisonRepository
      .createQueryBuilder('ci')
      .innerJoin('ci.listing', 'listing')
      .where('ci.user_id = :userId', { userId })
      .andWhere('listing.category = :category', { category })
      .getCount();
    return row;
  }

  private async filterIdsByCategory(ids: string[], category: string): Promise<string[]> {
    if (ids.length === 0) return [];
    const listings = await this.listingsRepository.find({
      where: { id: In(ids) },
      select: ['id', 'category'],
    });
    const map = new Map(listings.map((l) => [l.id, l.category]));
    const out: string[] = [];
    for (const id of ids) {
      if (map.get(id) === category) out.push(id);
    }
    return out;
  }
}
