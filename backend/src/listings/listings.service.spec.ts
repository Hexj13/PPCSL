import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BrandsService } from '../brands/brands.service';
import { Currency, ListingStatus } from '../common/types';
import { UsersService } from '../users/users.service';

import { ListingView } from './entities/listing-view.entity';
import { Listing } from './entities/listing.entity';
import { Vehicle } from './entities/vehicle.entity';
import { ListingsService } from './listings.service';

describe('ListingsService', () => {
  let service: ListingsService;
  let listingsRepository: jest.Mocked<Repository<Listing>>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let vehiclesRepository: jest.Mocked<Repository<Vehicle>>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let listingViewsRepository: jest.Mocked<Repository<ListingView>>;
  let usersService: jest.Mocked<UsersService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let brandsService: jest.Mocked<BrandsService>;

  const mockVehicle: Vehicle = {
    id: 'vehicle-1',
    brand_id: 'brand-1',
    model_id: 'model-1',
    year: 2020,
    mileage_km: 50000,
    fuel: 'Petrol',
    transmission: 'Manual',
    body_type: 'Sedan',
  } as Vehicle;

  const mockListing: Listing = {
    id: 'listing-1',
    title: 'Test Car',
    price: 10000,
    currency: Currency.MKD,
    city: 'Skopje',
    status: ListingStatus.Active,
    user_id: 'user-1',
    vehicle_id: 'vehicle-1',
    vehicle: mockVehicle,
    created_at: new Date(),
    updated_at: new Date(),
    last_updated_at: new Date(),
  } as Listing;

  beforeEach(async () => {
    const mockListingsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockVehiclesRepository = {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockListingViewsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    };

    const mockUsersService = {
      getListingLimit: jest.fn(),
      findOne: jest.fn(),
    };

    const mockBrandsService = {
      findOne: jest.fn(),
      getModelsByBrand: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingsService,
        {
          provide: getRepositoryToken(Listing),
          useValue: mockListingsRepository,
        },
        {
          provide: getRepositoryToken(Vehicle),
          useValue: mockVehiclesRepository,
        },
        {
          provide: getRepositoryToken(ListingView),
          useValue: mockListingViewsRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: BrandsService,
          useValue: mockBrandsService,
        },
      ],
    }).compile();

    service = module.get<ListingsService>(ListingsService);
    listingsRepository = module.get(getRepositoryToken(Listing));
    vehiclesRepository = module.get(getRepositoryToken(Vehicle));
    listingViewsRepository = module.get(getRepositoryToken(ListingView));
    usersService = module.get(UsersService);
    brandsService = module.get(BrandsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return listing by id', async () => {
      listingsRepository.findOne.mockResolvedValue(mockListing);

      const result = await service.findOne('listing-1');

      expect(result).toEqual(mockListing);
      expect(listingsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'listing-1' },
        relations: ['vehicle', 'vehicle.brand', 'vehicle.model', 'user'],
      });
    });

    it('should throw NotFoundException when listing is not found', async () => {
      listingsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getActiveListingsCount', () => {
    it('should return count of active listings for user', async () => {
      listingsRepository.count.mockResolvedValue(3);

      const result = await service.getActiveListingsCount('user-1');

      expect(result).toBe(3);
      expect(listingsRepository.count).toHaveBeenCalledWith({
        where: {
          user_id: 'user-1',
          status: ListingStatus.Active,
        },
      });
    });
  });

  describe('publish', () => {
    it('should publish listing when under limit', async () => {
      const pausedListing = { ...mockListing, status: ListingStatus.Paused };
      listingsRepository.findOne.mockResolvedValue(pausedListing);
      usersService.getListingLimit.mockResolvedValue(5);
      listingsRepository.count.mockResolvedValue(2);
      listingsRepository.save.mockResolvedValue({ ...pausedListing, status: ListingStatus.Active });

      const result = await service.publish('listing-1', 'user-1');

      expect(result.status).toBe(ListingStatus.Active);
      expect(listingsRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when limit is exceeded', async () => {
      const pausedListing = { ...mockListing, status: ListingStatus.Paused };
      listingsRepository.findOne.mockResolvedValue(pausedListing);
      usersService.getListingLimit.mockResolvedValue(5);
      listingsRepository.count.mockResolvedValue(5);

      await expect(service.publish('listing-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      listingsRepository.findOne.mockResolvedValue(mockListing);

      await expect(service.publish('listing-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('pause', () => {
    it('should pause listing', async () => {
      listingsRepository.findOne.mockResolvedValue(mockListing);
      listingsRepository.save.mockResolvedValue({ ...mockListing, status: ListingStatus.Paused });

      const result = await service.pause('listing-1', 'user-1');

      expect(result.status).toBe(ListingStatus.Paused);
      expect(listingsRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      listingsRepository.findOne.mockResolvedValue(mockListing);

      await expect(service.pause('listing-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('close', () => {
    it('should close listing', async () => {
      listingsRepository.findOne.mockResolvedValue(mockListing);
      listingsRepository.save.mockResolvedValue({ ...mockListing, status: ListingStatus.Closed });

      const result = await service.close('listing-1', 'user-1');

      expect(result.status).toBe(ListingStatus.Closed);
      expect(listingsRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      listingsRepository.findOne.mockResolvedValue(mockListing);

      await expect(service.close('listing-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByVin', () => {
    it('should return closed listings with matching VIN', async () => {
      const vin = 'TESTVIN123456789';
      const closedListing1 = {
        ...mockListing,
        id: 'listing-2',
        vin,
        status: ListingStatus.Closed,
        updated_at: new Date('2024-01-15'),
      };
      const closedListing2 = {
        ...mockListing,
        id: 'listing-3',
        vin,
        status: ListingStatus.Closed,
        updated_at: new Date('2024-01-10'),
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([closedListing1, closedListing2]),
      };

      listingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findByVin(vin);

      expect(result).toEqual([closedListing1, closedListing2]);
      expect(listingsRepository.createQueryBuilder).toHaveBeenCalledWith('listing');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('listing.vehicle', 'vehicle');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('vehicle.brand', 'brand');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('vehicle.model', 'model');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('listing.vin = :vin', {
        vin,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('listing.status = :status', {
        status: ListingStatus.Closed,
      });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('listing.updated_at', 'DESC');
    });

    it('should exclude listing by excludeId when provided', async () => {
      const vin = 'TESTVIN123456789';
      const excludeId = 'listing-1';
      const closedListing = {
        ...mockListing,
        id: 'listing-2',
        vin,
        status: ListingStatus.Closed,
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([closedListing]),
      };

      listingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findByVin(vin, excludeId);

      expect(result).toEqual([closedListing]);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('listing.id != :excludeId', {
        excludeId,
      });
    });

    it('should return empty array when no listings found', async () => {
      const vin = 'NONEXISTENTVIN';

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      listingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findByVin(vin);

      expect(result).toEqual([]);
    });

    it('should only return closed listings, not active ones', async () => {
      const vin = 'TESTVIN123456789';
      const closedListing = {
        ...mockListing,
        id: 'listing-2',
        vin,
        status: ListingStatus.Closed,
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([closedListing]),
      };

      listingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.findByVin(vin);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('listing.status = :status', {
        status: ListingStatus.Closed,
      });
    });
  });
});
