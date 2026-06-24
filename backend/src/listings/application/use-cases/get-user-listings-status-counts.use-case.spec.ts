import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { Listing } from '../../entities/listing.entity';
import { GetUserListingsStatusCountsUseCase } from './get-user-listings-status-counts.use-case';

describe('GetUserListingsStatusCountsUseCase', () => {
  let useCase: GetUserListingsStatusCountsUseCase;
  let listingsRepository: jest.Mocked<Repository<Listing>>;

  beforeEach(async () => {
    const mockListingsRepository = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserListingsStatusCountsUseCase,
        {
          provide: getRepositoryToken(Listing),
          useValue: mockListingsRepository,
        },
      ],
    }).compile();

    useCase = module.get(GetUserListingsStatusCountsUseCase);
    listingsRepository = module.get(getRepositoryToken(Listing));
  });

  it('should return status counts without search', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        Active: '5',
        Paused: '2',
        Closed: '1',
        Promoted: '3',
      }),
    };

    listingsRepository.createQueryBuilder.mockReturnValueOnce(chain as never);

    const result = await useCase.execute('user-1');

    expect(result).toEqual({
      Active: 5,
      Paused: 2,
      Closed: 1,
      Promoted: 3,
    });
    expect(listingsRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(chain.select).toHaveBeenCalledWith(
      'COUNT(*) FILTER (WHERE listing.status = :activeStatus)',
      'Active',
    );
    expect(chain.addSelect).toHaveBeenCalledWith(
      'COUNT(*) FILTER (WHERE listing.status = :pausedStatus)',
      'Paused',
    );
    expect(chain.addSelect).toHaveBeenCalledWith(
      'COUNT(*) FILTER (WHERE listing.status = :closedStatus)',
      'Closed',
    );
    expect(chain.addSelect).toHaveBeenCalledWith(
      'COUNT(*) FILTER (WHERE listing.is_promoted = :isPromoted)',
      'Promoted',
    );
    expect(chain.setParameters).toHaveBeenCalledWith({
      activeStatus: ListingStatusEnum.Active,
      pausedStatus: ListingStatusEnum.Paused,
      closedStatus: ListingStatusEnum.Closed,
      isPromoted: true,
      userId: 'user-1',
    });
    expect(chain.where).toHaveBeenCalledWith('listing.user_id = :userId');
  });

  it('should apply search filter when provided', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        Active: 0,
        Paused: 0,
        Closed: 0,
        Promoted: 0,
      }),
    };

    listingsRepository.createQueryBuilder.mockReturnValueOnce(chain as never);

    await useCase.execute('user-1', 'bmw');

    expect(chain.leftJoin).toHaveBeenCalledWith('listing.vehicle', 'vehicle');
    expect(chain.leftJoin).toHaveBeenCalledWith('vehicle.brand', 'brand');
    expect(chain.leftJoin).toHaveBeenCalledWith('vehicle.model', 'model');
    expect(chain.andWhere).toHaveBeenCalledWith(expect.any(Brackets));
  });
});
