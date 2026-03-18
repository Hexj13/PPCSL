import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { Listing } from '../../entities/listing.entity';
import { RefreshAllDatesUseCase } from './refresh-all-dates.use-case';

describe('RefreshAllDatesUseCase', () => {
  let useCase: RefreshAllDatesUseCase;
  let listingsRepository: {
    manager: {
      createQueryBuilder: jest.Mock;
      update: jest.Mock;
      transaction: jest.Mock;
    };
  };
  let queryBuilder: {
    update: jest.Mock;
    set: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    execute: jest.Mock;
  };

  beforeEach(async () => {
    queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    };

    listingsRepository = {
      manager: {
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        update: jest.fn(),
        transaction: jest.fn(),
      },
    };
    listingsRepository.manager.transaction.mockImplementation(async (callback) =>
      callback(listingsRepository.manager),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshAllDatesUseCase,
        {
          provide: getRepositoryToken(Listing),
          useValue: listingsRepository,
        },
      ],
    }).compile();

    useCase = module.get(RefreshAllDatesUseCase);
  });

  it('throws BadRequestException when cooldown is not passed', async () => {
    queryBuilder.execute.mockResolvedValue({ affected: 0 });

    await expect(useCase.execute('user-1')).rejects.toThrow(BadRequestException);
    expect(listingsRepository.manager.update).not.toHaveBeenCalled();
  });

  it('updates all active listings when cooldown is passed', async () => {
    queryBuilder.execute.mockResolvedValue({ affected: 1 });
    listingsRepository.manager.update.mockResolvedValue({ affected: 1000 });

    const result = await useCase.execute('user-1');

    expect(result).toEqual({ updated: 1000 });
    expect(listingsRepository.manager.update).toHaveBeenCalledWith(
      Listing,
      { user_id: 'user-1', status: ListingStatusEnum.Active },
      { last_updated_at: expect.any(Date) },
    );
    expect(queryBuilder.execute).toHaveBeenCalledTimes(1);
  });

  it('returns zero when user has no active listings', async () => {
    queryBuilder.execute.mockResolvedValue({ affected: 1 });
    listingsRepository.manager.update.mockResolvedValue({ affected: 0 });

    const result = await useCase.execute('user-1');

    expect(result).toEqual({ updated: 0 });
    expect(listingsRepository.manager.update).toHaveBeenCalledWith(
      Listing,
      { user_id: 'user-1', status: ListingStatusEnum.Active },
      { last_updated_at: expect.any(Date) },
    );
  });
});
