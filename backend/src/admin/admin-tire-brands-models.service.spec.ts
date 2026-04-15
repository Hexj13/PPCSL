import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { LISTING_CACHE } from '../listings/application/ports/listing-cache.port';
import { Listing } from '../listings/entities/listing.entity';
import { TIRES_CACHE } from '../tires/application/ports/tires-cache.port';
import { TireBrand } from '../tires/entities/tire-brand.entity';
import { TireModel } from '../tires/entities/tire-model.entity';

import { AdminAuditService } from './admin-audit.service';
import { AdminTireBrandsModelsService } from './admin-tire-brands-models.service';

describe('AdminTireBrandsModelsService', () => {
  let service: AdminTireBrandsModelsService;
  const auditLog = jest.fn();
  const tiresInvalidateAll = jest.fn();
  const tiresInvalidateModels = jest.fn();
  const listingInvalidateSearch = jest.fn();

  const qbChain = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getRawOne: jest.fn().mockResolvedValue({ cnt: '0' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const tireBrandRepo = {
      createQueryBuilder: jest.fn(() => qbChain),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    } as unknown as Repository<TireBrand>;
    const tireModelRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    } as unknown as Repository<TireModel>;
    const listingRepo = {
      createQueryBuilder: jest.fn(() => qbChain),
    } as unknown as Repository<Listing>;
    const dataSource = {
      transaction: jest.fn(),
    } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminTireBrandsModelsService,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(TireBrand), useValue: tireBrandRepo },
        { provide: getRepositoryToken(TireModel), useValue: tireModelRepo },
        { provide: getRepositoryToken(Listing), useValue: listingRepo },
        { provide: AdminAuditService, useValue: { log: auditLog } },
        {
          provide: TIRES_CACHE,
          useValue: { invalidateAll: tiresInvalidateAll, invalidateModels: tiresInvalidateModels },
        },
        { provide: LISTING_CACHE, useValue: { invalidateSearch: listingInvalidateSearch } },
      ],
    }).compile();

    service = module.get(AdminTireBrandsModelsService);
  });

  it('getTireBrandsModels returns empty meta when no brands', async () => {
    const res = await service.getTireBrandsModels(1, 20);
    expect(res.data).toEqual([]);
    expect(res.meta.total).toBe(0);
    expect(res.meta.page).toBe(1);
    expect(res.meta.totalPages).toBe(1);
  });

  it('createTireBrand throws ConflictException when active duplicate name exists', async () => {
    const duplicate = {
      id: 'b1',
      name: 'Michelin',
      name_normalized: 'michelin',
      is_archived: false,
    };
    const manager = {
      findOne: jest.fn().mockResolvedValue(duplicate),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(async (fn: (m: EntityManager) => Promise<unknown>) => fn(manager)),
    } as unknown as DataSource;
    const tireBrandRepo = {
      createQueryBuilder: jest.fn(() => qbChain),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    } as unknown as Repository<TireBrand>;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminTireBrandsModelsService,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(TireBrand), useValue: tireBrandRepo },
        {
          provide: getRepositoryToken(TireModel),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Listing),
          useValue: { createQueryBuilder: jest.fn(() => qbChain) },
        },
        { provide: AdminAuditService, useValue: { log: auditLog } },
        {
          provide: TIRES_CACHE,
          useValue: { invalidateAll: tiresInvalidateAll, invalidateModels: tiresInvalidateModels },
        },
        { provide: LISTING_CACHE, useValue: { invalidateSearch: listingInvalidateSearch } },
      ],
    }).compile();
    const s = module.get(AdminTireBrandsModelsService);
    await expect(
      s.createTireBrand({ name: 'Michelin' }, { actorUserId: 'admin-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tiresInvalidateAll).not.toHaveBeenCalled();
  });
});
