import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder, UpdateResult } from 'typeorm';

import { BrandsService } from '../brands/brands.service';
import { Brand } from '../brands/entities/brand.entity';
import { VehicleModel } from '../brands/entities/vehicle-model.entity';
import { RedisService } from '../common/redis.service';
import { Currency, ListingStatus } from '../common/types';
import { UsersService } from '../users/users.service';

import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let redisService: jest.Mocked<RedisService>;

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
    last_edited_at: null,
    last_published_at: new Date(),
    closed_at: null,
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
      manager: {
        connection: {
          queryResultCache: {
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
      },
    };

    const mockVehiclesRepository = {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
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

    const mockRedisService = {
      delPattern: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(undefined),
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
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<ListingsService>(ListingsService);
    listingsRepository = module.get(getRepositoryToken(Listing));
    vehiclesRepository = module.get(getRepositoryToken(Vehicle));
    listingViewsRepository = module.get(getRepositoryToken(ListingView));
    usersService = module.get(UsersService);
    brandsService = module.get(BrandsService);
    redisService = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return listing by id', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockListing),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findOne('listing-1');

      expect(result).toEqual(mockListing);
      expect(listingsRepository.createQueryBuilder).toHaveBeenCalledWith('listing');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('listing.vehicle', 'vehicle');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('vehicle.brand', 'brand');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('vehicle.model', 'model');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('listing.user', 'user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('listing.id = :id', { id: 'listing-1' });
      expect(mockQueryBuilder.getOne).toHaveBeenCalled();
    });

    it('should throw NotFoundException when listing is not found', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

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
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(pausedListing),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      usersService.getListingLimit.mockResolvedValue(100);
      listingsRepository.count.mockResolvedValue(99);
      listingsRepository.save.mockResolvedValue({ ...pausedListing, status: ListingStatus.Active });

      const result = await service.publish('listing-1', 'user-1');

      expect(result.status).toBe(ListingStatus.Active);
      expect(listingsRepository.save).toHaveBeenCalled();
      const savedListing = listingsRepository.save.mock.calls[0][0] as Listing;
      expect(savedListing.last_published_at).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException when limit is exceeded', async () => {
      const pausedListing = { ...mockListing, status: ListingStatus.Paused };
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(pausedListing),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      usersService.getListingLimit.mockResolvedValue(100);
      listingsRepository.count.mockResolvedValue(100);

      await expect(service.publish('listing-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockListing),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await expect(service.publish('listing-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('pause', () => {
    it('should pause listing', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockListing),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      listingsRepository.save.mockResolvedValue({ ...mockListing, status: ListingStatus.Paused });

      const result = await service.pause('listing-1', 'user-1');

      expect(result.status).toBe(ListingStatus.Paused);
      expect(listingsRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockListing),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await expect(service.pause('listing-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('close', () => {
    it('should close listing and set closed_at', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockListing),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      const closedAt = new Date();
      listingsRepository.save.mockResolvedValue({
        ...mockListing,
        status: ListingStatus.Closed,
        closed_at: closedAt,
      });

      const result = await service.close('listing-1', 'user-1');

      expect(result.status).toBe(ListingStatus.Closed);
      expect(listingsRepository.save).toHaveBeenCalled();
      const savedListing = listingsRepository.save.mock.calls[0][0] as Listing;
      expect(savedListing.status).toBe(ListingStatus.Closed);
      expect(savedListing.closed_at).toBeInstanceOf(Date);
      if (savedListing.closed_at) {
        expect(savedListing.closed_at.getTime()).toBeCloseTo(closedAt.getTime(), -2);
      }
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockListing),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

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

      listingsRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<Listing>,
      );

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

      listingsRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<Listing>,
      );

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

      listingsRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<Listing>,
      );

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

      listingsRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<Listing>,
      );

      await service.findByVin(vin);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('listing.status = :status', {
        status: ListingStatus.Closed,
      });
    });
  });

  describe('closeAllUserListings', () => {
    const userId = 'user-1';

    it('should close all active and paused listings for user and set closed_at', async () => {
      const mockListings = [
        { id: '1', status: ListingStatus.Active, images: ['image1.jpg', 'image2.jpg'] },
        { id: '2', status: ListingStatus.Paused, images: ['image3.jpg'] },
        { id: '3', status: ListingStatus.Active, images: ['image4.jpg', 'image5.jpg'] },
        { id: '4', status: ListingStatus.Paused, images: ['image6.jpg'] },
        { id: '5', status: ListingStatus.Active, images: ['image7.jpg'] },
      ] as Listing[];
      listingsRepository.find.mockResolvedValue(mockListings);
      listingsRepository.save.mockImplementation((listing) => Promise.resolve(listing as Listing));
      redisService.delPattern.mockResolvedValue(undefined);

      const result = await service.closeAllUserListings(userId);

      expect(listingsRepository.find).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          status: In([ListingStatus.Active, ListingStatus.Paused]),
        },
      });
      expect(listingsRepository.save).toHaveBeenCalledTimes(5);
      expect(redisService.delPattern).toHaveBeenCalledWith('cache:listings:search:*');
      expect(result).toBe(5);

      const savedCalls = listingsRepository.save.mock.calls;
      const firstListing = savedCalls[0][0] as Listing;
      const closedAt = firstListing.closed_at;
      expect(closedAt).toBeInstanceOf(Date);
      savedCalls.forEach((call) => {
        const listing = call[0] as Listing;
        expect(listing.status).toBe(ListingStatus.Closed);
        expect(listing.closed_at).toBeInstanceOf(Date);
        if (listing.closed_at && closedAt) {
          expect(listing.closed_at.getTime()).toBe(closedAt.getTime());
        }
      });
    });

    it('should return 0 when no listings to close', async () => {
      listingsRepository.find.mockResolvedValue([]);
      redisService.delPattern.mockResolvedValue(undefined);

      const result = await service.closeAllUserListings(userId);

      expect(listingsRepository.find).toHaveBeenCalled();
      expect(listingsRepository.save).not.toHaveBeenCalled();
      expect(result).toBe(0);
      expect(redisService.delPattern).toHaveBeenCalled();
    });

    it('should handle cache invalidation errors gracefully', async () => {
      const mockListings = [
        { id: '1', status: ListingStatus.Active, images: ['image1.jpg'] },
        { id: '2', status: ListingStatus.Paused, images: ['image2.jpg'] },
        { id: '3', status: ListingStatus.Active, images: ['image3.jpg'] },
      ] as Listing[];
      listingsRepository.find.mockResolvedValue(mockListings);
      listingsRepository.save.mockImplementation((listing) => Promise.resolve(listing as Listing));
      redisService.delPattern.mockRejectedValue(new Error('Cache error'));

      const result = await service.closeAllUserListings(userId);

      expect(result).toBe(3);
      expect(redisService.delPattern).toHaveBeenCalled();
    });

    it('should only close Active and Paused listings, not Closed ones', async () => {
      const mockListings = [
        { id: '1', status: ListingStatus.Active, images: ['image1.jpg'] },
        { id: '2', status: ListingStatus.Paused, images: ['image2.jpg'] },
      ] as Listing[];
      listingsRepository.find.mockResolvedValue(mockListings);
      listingsRepository.save.mockImplementation((listing) => Promise.resolve(listing as Listing));
      redisService.delPattern.mockResolvedValue(undefined);

      await service.closeAllUserListings(userId);

      expect(listingsRepository.find).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          status: In([ListingStatus.Active, ListingStatus.Paused]),
        },
      });
      expect(listingsRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should preserve images when closing listings', async () => {
      const mockListings = [
        { id: '1', status: ListingStatus.Active, images: ['image1.jpg', 'image2.jpg'] },
        { id: '2', status: ListingStatus.Paused, images: ['image3.jpg'] },
      ] as Listing[];
      listingsRepository.find.mockResolvedValue(mockListings);
      listingsRepository.save.mockImplementation((listing) => Promise.resolve(listing as Listing));
      redisService.delPattern.mockResolvedValue(undefined);

      await service.closeAllUserListings(userId);

      expect(listingsRepository.save).toHaveBeenCalledTimes(2);
      const savedCalls = listingsRepository.save.mock.calls;
      expect(savedCalls[0][0].images).toEqual(['image1.jpg', 'image2.jpg']);
      expect(savedCalls[0][0].status).toBe(ListingStatus.Closed);
      expect(savedCalls[0][0].closed_at).toBeInstanceOf(Date);
      expect(savedCalls[1][0].images).toEqual(['image3.jpg']);
      expect(savedCalls[1][0].status).toBe(ListingStatus.Closed);
      expect(savedCalls[1][0].closed_at).toBeInstanceOf(Date);
    });
  });

  describe('create', () => {
    it('should throw BadRequestException when registration_expires_at is in the past', async () => {
      const currentDate = new Date();
      const pastDate = new Date(currentDate);
      pastDate.setMonth(pastDate.getMonth() - 1);

      const createDto = {
        price: 10000,
        currency: Currency.MKD,
        city: 'Skopje',
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          year: 2020,
        },
        registration_expires_at: pastDate.toISOString(),
      };

      await expect(
        service.create(createDto as Partial<CreateListingDto> as CreateListingDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow registration_expires_at in current or future month', async () => {
      const currentDate = new Date();
      const futureDate = new Date(currentDate);
      futureDate.setMonth(futureDate.getMonth() + 1);

      const createDto = {
        price: 10000,
        currency: Currency.MKD,
        city: 'Skopje',
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          year: 2020,
        },
        registration_expires_at: futureDate.toISOString(),
      };

      vehiclesRepository.create.mockReturnValue(mockVehicle as Vehicle);
      vehiclesRepository.save.mockResolvedValue(mockVehicle);
      brandsService.findOne.mockResolvedValue({ id: 'brand-1', name: 'Brand' } as Brand);
      brandsService.getModelsByBrand.mockResolvedValue([
        { id: 'model-1', name: 'Model' },
      ] as VehicleModel[]);
      usersService.getListingLimit.mockResolvedValue(100);
      listingsRepository.count.mockResolvedValue(0);
      listingsRepository.create.mockReturnValue(mockListing as Listing);
      listingsRepository.save.mockResolvedValue(mockListing);

      await service.create(createDto as Partial<CreateListingDto> as CreateListingDto, 'user-1');

      expect(vehiclesRepository.save).toHaveBeenCalled();
      expect(listingsRepository.save).toHaveBeenCalled();
    });

    it('should set last_published_at when creating listing with Active status', async () => {
      const createDto = {
        price: 10000,
        currency: Currency.MKD,
        city: 'Skopje',
        status: ListingStatus.Active,
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          year: 2020,
        },
      };

      vehiclesRepository.create.mockReturnValue(mockVehicle as Vehicle);
      vehiclesRepository.save.mockResolvedValue(mockVehicle);
      brandsService.findOne.mockResolvedValue({ id: 'brand-1', name: 'Brand' } as Brand);
      brandsService.getModelsByBrand.mockResolvedValue([
        { id: 'model-1', name: 'Model' },
      ] as VehicleModel[]);
      usersService.getListingLimit.mockResolvedValue(100);
      listingsRepository.count.mockResolvedValue(0);
      listingsRepository.create.mockReturnValue(mockListing as Listing);
      listingsRepository.save.mockResolvedValue(mockListing);

      await service.create(createDto as Partial<CreateListingDto> as CreateListingDto, 'user-1');

      expect(listingsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ListingStatus.Active,
          last_published_at: expect.any(Date),
        }),
      );
    });

    it('should set last_published_at to null when creating listing with Paused status', async () => {
      const createDto = {
        price: 10000,
        currency: Currency.MKD,
        city: 'Skopje',
        status: ListingStatus.Paused,
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          year: 2020,
        },
      };

      vehiclesRepository.create.mockReturnValue(mockVehicle as Vehicle);
      vehiclesRepository.save.mockResolvedValue(mockVehicle);
      brandsService.findOne.mockResolvedValue({ id: 'brand-1', name: 'Brand' } as Brand);
      brandsService.getModelsByBrand.mockResolvedValue([
        { id: 'model-1', name: 'Model' },
      ] as VehicleModel[]);
      listingsRepository.create.mockReturnValue(mockListing as Listing);
      listingsRepository.save.mockResolvedValue(mockListing);

      await service.create(createDto as Partial<CreateListingDto> as CreateListingDto, 'user-1');

      expect(listingsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ListingStatus.Paused,
          last_published_at: null,
        }),
      );
    });
  });

  describe('update', () => {
    it('should throw BadRequestException when registration_expires_at is in the past', async () => {
      const currentDate = new Date();
      const pastDate = new Date(currentDate);
      pastDate.setMonth(pastDate.getMonth() - 1);

      const updateDto = {
        registration_expires_at: pastDate.toISOString(),
      };

      const activeListing = { ...mockListing, status: ListingStatus.Active };
      listingsRepository.findOne
        .mockResolvedValueOnce(activeListing)
        .mockResolvedValueOnce(activeListing);
      vehiclesRepository.findOne.mockResolvedValue(mockVehicle);
      brandsService.findOne.mockResolvedValue({ id: 'brand-1', name: 'Brand' } as Brand);
      brandsService.getModelsByBrand.mockResolvedValue([
        { id: 'model-1', name: 'Model' },
      ] as VehicleModel[]);

      await expect(
        service.update(
          'listing-1',
          updateDto as Partial<UpdateListingDto> as UpdateListingDto,
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow registration_expires_at in current or future month', async () => {
      const currentDate = new Date();
      const futureDate = new Date(currentDate);
      futureDate.setMonth(futureDate.getMonth() + 1);

      const updateDto = {
        registration_expires_at: futureDate.toISOString(),
      };

      const activeListing = { ...mockListing, status: ListingStatus.Active };
      listingsRepository.findOne
        .mockResolvedValueOnce(activeListing)
        .mockResolvedValueOnce(activeListing);
      vehiclesRepository.findOne.mockResolvedValue(mockVehicle);
      brandsService.findOne.mockResolvedValue({ id: 'brand-1', name: 'Brand' } as Brand);
      brandsService.getModelsByBrand.mockResolvedValue([
        { id: 'model-1', name: 'Model' },
      ] as VehicleModel[]);
      const updateResult: UpdateResult = { affected: 1, generatedMaps: [], raw: [] };
      listingsRepository.update.mockResolvedValue(updateResult);

      await service.update(
        'listing-1',
        updateDto as Partial<UpdateListingDto> as UpdateListingDto,
        'user-1',
      );

      expect(listingsRepository.update).toHaveBeenCalled();
    });

    it('should update last_edited_at when listing is edited', async () => {
      const updateDto = {
        price: 15000,
        description: 'Updated description',
      };

      const activeListing = { ...mockListing, status: ListingStatus.Active };
      listingsRepository.findOne
        .mockResolvedValueOnce(activeListing)
        .mockResolvedValueOnce(activeListing);
      vehiclesRepository.findOne.mockResolvedValue(mockVehicle);
      brandsService.findOne.mockResolvedValue({ id: 'brand-1', name: 'Brand' } as Brand);
      brandsService.getModelsByBrand.mockResolvedValue([
        { id: 'model-1', name: 'Model' },
      ] as VehicleModel[]);
      const updateResult: UpdateResult = { affected: 1, generatedMaps: [], raw: [] };
      listingsRepository.update.mockResolvedValue(updateResult);

      await service.update(
        'listing-1',
        updateDto as Partial<UpdateListingDto> as UpdateListingDto,
        'user-1',
      );

      expect(listingsRepository.update).toHaveBeenCalledWith(
        'listing-1',
        expect.objectContaining({
          last_edited_at: expect.any(Date),
        }),
      );
    });
  });

  describe('autoCloseOldListings', () => {
    it('should close old listings and set closed_at', async () => {
      const updateResult: UpdateResult = { affected: 3, generatedMaps: [], raw: [] };
      listingsRepository.update.mockResolvedValue(updateResult);

      const result = await service.autoCloseOldListings();

      expect(listingsRepository.update).toHaveBeenCalledWith(
        {
          status: ListingStatus.Active,
          last_updated_at: expect.any(Object),
        },
        expect.objectContaining({
          status: ListingStatus.Closed,
          closed_at: expect.any(Date),
        }),
      );
      expect(result).toEqual({ closed: 3 });
    });
  });

  describe('refreshAllDates', () => {
    it('should update last_updated_at for all active listings of user', async () => {
      const userId = 'user-1';
      const updateResult: UpdateResult = { affected: 5, generatedMaps: [], raw: [] };
      listingsRepository.update.mockResolvedValue(updateResult);

      const result = await service.refreshAllDates(userId);

      expect(listingsRepository.update).toHaveBeenCalledWith(
        { user_id: userId, status: ListingStatus.Active },
        expect.objectContaining({
          last_updated_at: expect.any(Date),
        }),
      );
      expect(result).toEqual({ updated: 5 });
    });

    it('should return 0 when no active listings found', async () => {
      const userId = 'user-1';
      const updateResult: UpdateResult = { affected: 0, generatedMaps: [], raw: [] };
      listingsRepository.update.mockResolvedValue(updateResult);

      const result = await service.refreshAllDates(userId);

      expect(result).toEqual({ updated: 0 });
    });
  });
});
