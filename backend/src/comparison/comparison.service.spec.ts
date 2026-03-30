import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ListingCategory } from '../common/constants';
import { Listing } from '../listings/entities/listing.entity';

import { ComparisonService } from './comparison.service';
import { ComparisonItem } from './entities/comparison-item.entity';

function queryBuilderMock(getMany: jest.Mock, getCount: jest.Mock) {
  const chain = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany,
    getCount,
  };
  return {
    createQueryBuilder: jest.fn(() => chain),
  };
}

describe('ComparisonService', () => {
  let service: ComparisonService;
  let getMany: jest.Mock;
  let getCount: jest.Mock;
  let transaction: jest.Mock;
  let comparisonRepo: ReturnType<typeof queryBuilderMock> & {
    findOne: jest.Mock;
    delete: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let listingsRepo: { findOne: jest.Mock; find: jest.Mock };

  beforeEach(async () => {
    getMany = jest.fn();
    getCount = jest.fn();
    transaction = jest.fn(async (fn: (em: unknown) => Promise<void>) => {
      const em = {
        delete: jest.fn().mockResolvedValue(undefined),
        insert: jest.fn().mockResolvedValue(undefined),
      };
      await fn(em);
    });

    const qb = queryBuilderMock(getMany, getCount);
    comparisonRepo = {
      ...qb,
      findOne: jest.fn(),
      delete: jest.fn(),
      save: jest.fn(),
      create: jest.fn((x) => x),
      manager: { transaction },
    };

    listingsRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ComparisonService,
        { provide: getRepositoryToken(ComparisonItem), useValue: comparisonRepo },
        { provide: getRepositoryToken(Listing), useValue: listingsRepo },
      ],
    }).compile();

    service = moduleRef.get(ComparisonService);
  });

  describe('add', () => {
    it('throws NotFound when listing missing', async () => {
      listingsRepo.findOne.mockResolvedValue(null);
      await expect(service.add('u1', 'l1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns existing row when already in comparison', async () => {
      listingsRepo.findOne.mockResolvedValue({
        id: 'l1',
        category: ListingCategory.Vehicle,
      } as Listing);
      const existing = { id: 'c1', user_id: 'u1', listing_id: 'l1' } as ComparisonItem;
      comparisonRepo.findOne.mockResolvedValue(existing);
      await expect(service.add('u1', 'l1')).resolves.toBe(existing);
    });

    it('throws BadRequest when vehicle bucket full', async () => {
      listingsRepo.findOne.mockResolvedValue({
        id: 'l-new',
        category: ListingCategory.Vehicle,
      } as Listing);
      comparisonRepo.findOne.mockResolvedValue(null);
      getCount.mockResolvedValue(3);
      await expect(service.add('u1', 'l-new')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('saves when under limit', async () => {
      listingsRepo.findOne.mockResolvedValue({
        id: 'l-new',
        category: ListingCategory.Vehicle,
      } as Listing);
      comparisonRepo.findOne.mockResolvedValue(null);
      getCount.mockResolvedValue(2);
      const saved = { id: 'c-new', user_id: 'u1', listing_id: 'l-new' } as ComparisonItem;
      comparisonRepo.save.mockResolvedValue(saved);
      await expect(service.add('u1', 'l-new')).resolves.toBe(saved);
      expect(comparisonRepo.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('throws NotFound when nothing deleted', async () => {
      comparisonRepo.delete.mockResolvedValue({ affected: 0, raw: [] });
      await expect(service.remove('u1', 'l1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('sync', () => {
    it('merges server order before guest ids', async () => {
      listingsRepo.find
        .mockResolvedValueOnce([{ id: 'v2', category: ListingCategory.Vehicle }] as Listing[])
        .mockResolvedValueOnce([{ id: 't2', category: ListingCategory.Tire }] as Listing[]);

      getMany.mockResolvedValue([
        {
          listing_id: 'v1',
          listing: { category: ListingCategory.Vehicle },
        },
        {
          listing_id: 't1',
          listing: { category: ListingCategory.Tire },
        },
      ] as ComparisonItem[]);

      const result = await service.sync('u1', ['v2'], ['t2']);
      expect(result.vehicleListingIds).toEqual(['v1', 'v2']);
      expect(result.tireListingIds).toEqual(['t1', 't2']);
      expect(transaction).toHaveBeenCalled();
    });
  });
});
