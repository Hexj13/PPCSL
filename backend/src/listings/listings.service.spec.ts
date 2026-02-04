import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder, UpdateResult } from 'typeorm';

import { BrandsService } from '../brands/brands.service';
import { Brand } from '../brands/entities/brand.entity';
import { VehicleModel } from '../brands/entities/vehicle-model.entity';
import { I18nService } from '../common/i18n/i18n.service';
import { RedisService } from '../common/redis.service';
import { Currency, ListingStatus } from '../common/types';
import { UsersService } from '../users/users.service';

import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingView } from './entities/listing-view.entity';
import { Listing } from './entities/listing.entity';
import { PromotionHistory } from './entities/promotion-history.entity';
import { Vehicle } from './entities/vehicle.entity';
import { ListingsService } from './listings.service';

describe('ListingsService', () => {
  let service: ListingsService;
  let listingsRepository: jest.Mocked<Repository<Listing>>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let vehiclesRepository: jest.Mocked<Repository<Vehicle>>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let listingViewsRepository: jest.Mocked<Repository<ListingView>>;
  let promotionHistoryRepository: jest.Mocked<Repository<PromotionHistory>>;
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
    currency: Currency.EUR,
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
      getLastListingRefreshAt: jest.fn(),
      update: jest.fn(),
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
      invalidateByPrefix: jest.fn().mockResolvedValue(undefined),
    };

    const mockI18nService = {
      translate: jest.fn((key: string) => key),
      getLocaleFromHeader: jest.fn(() => 'ro'),
    };

    const mockPromotionHistoryRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
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
          provide: getRepositoryToken(PromotionHistory),
          useValue: mockPromotionHistoryRepository,
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
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<ListingsService>(ListingsService);
    listingsRepository = module.get(getRepositoryToken(Listing));
    vehiclesRepository = module.get(getRepositoryToken(Vehicle));
    listingViewsRepository = module.get(getRepositoryToken(ListingView));
    promotionHistoryRepository = module.get(getRepositoryToken(PromotionHistory));
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
      const mockPromotedListings: Listing[] = [];
      listingsRepository.find.mockResolvedValueOnce(mockPromotedListings);
      const updateResult: UpdateResult = { affected: 5, generatedMaps: [], raw: [] };
      listingsRepository.update.mockResolvedValue(updateResult);
      redisService.delPattern.mockResolvedValue(undefined);

      const result = await service.closeAllUserListings(userId);

      expect(listingsRepository.find).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          status: In([ListingStatus.Active, ListingStatus.Paused]),
          is_promoted: true,
        },
        select: ['id'],
      });
      expect(listingsRepository.update).toHaveBeenCalledWith(
        {
          user_id: userId,
          status: In([ListingStatus.Active, ListingStatus.Paused]),
        },
        expect.objectContaining({
          status: ListingStatus.Closed,
          closed_at: expect.any(Date),
          is_promoted: false,
          promoted_until: null,
          promoted_started_at: null,
          promoted_paused_at: null,
        }),
      );
      expect(redisService.delPattern).toHaveBeenCalledWith('cache:listings:search:*');
      expect(result).toBe(5);
    });

    it('should return 0 when no listings to close', async () => {
      const mockPromotedListings: Listing[] = [];
      listingsRepository.find.mockResolvedValueOnce(mockPromotedListings);
      const updateResult: UpdateResult = { affected: 0, generatedMaps: [], raw: [] };
      listingsRepository.update.mockResolvedValue(updateResult);
      redisService.delPattern.mockResolvedValue(undefined);

      const result = await service.closeAllUserListings(userId);

      expect(listingsRepository.update).toHaveBeenCalled();
      expect(result).toBe(0);
      expect(redisService.delPattern).toHaveBeenCalled();
    });

    it('should handle cache invalidation errors gracefully', async () => {
      const mockPromotedListings: Listing[] = [];
      listingsRepository.find.mockResolvedValueOnce(mockPromotedListings);
      const updateResult: UpdateResult = { affected: 3, generatedMaps: [], raw: [] };
      listingsRepository.update.mockResolvedValue(updateResult);
      redisService.delPattern.mockRejectedValue(new Error('Cache error'));

      const result = await service.closeAllUserListings(userId);

      expect(result).toBe(3);
      expect(redisService.delPattern).toHaveBeenCalled();
    });

    it('should only close Active and Paused listings, not Closed ones', async () => {
      const mockPromotedListings: Listing[] = [];
      listingsRepository.find.mockResolvedValueOnce(mockPromotedListings);
      const updateResult: UpdateResult = { affected: 2, generatedMaps: [], raw: [] };
      listingsRepository.update.mockResolvedValue(updateResult);
      redisService.delPattern.mockResolvedValue(undefined);

      await service.closeAllUserListings(userId);

      expect(listingsRepository.update).toHaveBeenCalledWith(
        {
          user_id: userId,
          status: In([ListingStatus.Active, ListingStatus.Paused]),
        },
        expect.any(Object),
      );
    });

    it('should preserve images when closing listings', async () => {
      const mockPromotedListings: Listing[] = [];
      listingsRepository.find.mockResolvedValueOnce(mockPromotedListings);
      const updateResult: UpdateResult = { affected: 2, generatedMaps: [], raw: [] };
      listingsRepository.update.mockResolvedValue(updateResult);
      redisService.delPattern.mockResolvedValue(undefined);

      await service.closeAllUserListings(userId);

      expect(listingsRepository.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          status: ListingStatus.Closed,
          closed_at: expect.any(Date),
        }),
      );
    });
  });

  describe('create', () => {
    it('should throw BadRequestException when registration_expires_at is in the past', async () => {
      const currentDate = new Date();
      const pastDate = new Date(currentDate);
      pastDate.setMonth(pastDate.getMonth() - 2);
      const pastDateString = pastDate.toISOString().split('T')[0];

      const createDto = {
        price: 10000,
        currency: Currency.EUR,
        city: 'Skopje',
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          year: 2020,
        },
        registration_expires_at: pastDateString,
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
        currency: Currency.EUR,
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
        currency: Currency.EUR,
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
        currency: Currency.EUR,
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

    it('should create listing with equipment array', async () => {
      const createDto = {
        price: 10000,
        currency: Currency.EUR,
        city: 'Skopje',
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          year: 2020,
        },
        equipment: ['air_conditioning', 'navigation', 'parking_sensors'],
      };

      vehiclesRepository.create.mockReturnValue(mockVehicle as Vehicle);
      vehiclesRepository.save.mockResolvedValue(mockVehicle);
      brandsService.findOne.mockResolvedValue({ id: 'brand-1', name: 'Brand' } as Brand);
      brandsService.getModelsByBrand.mockResolvedValue([
        { id: 'model-1', name: 'Model' },
      ] as VehicleModel[]);
      usersService.getListingLimit.mockResolvedValue(100);
      listingsRepository.count.mockResolvedValue(0);
      const listingWithEquipment = { ...mockListing, equipment: createDto.equipment };
      listingsRepository.create.mockReturnValue(listingWithEquipment as Listing);
      listingsRepository.save.mockResolvedValue(listingWithEquipment);

      const result = await service.create(
        createDto as Partial<CreateListingDto> as CreateListingDto,
        'user-1',
      );

      expect(listingsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: ['air_conditioning', 'navigation', 'parking_sensors'],
        }),
      );
      expect(result.equipment).toEqual(['air_conditioning', 'navigation', 'parking_sensors']);
    });

    it('should create listing without equipment when equipment is not provided', async () => {
      const createDto = {
        price: 10000,
        currency: Currency.EUR,
        city: 'Skopje',
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

      const createCall = listingsRepository.create.mock.calls[0][0];
      expect(createCall.equipment).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should throw BadRequestException when registration_expires_at is in the past', async () => {
      const currentDate = new Date();
      const pastDate = new Date(currentDate);
      pastDate.setMonth(pastDate.getMonth() - 2);
      const pastDateString = pastDate.toISOString().split('T')[0];

      const updateDto = {
        registration_expires_at: pastDateString,
      };

      const activeListing = { ...mockListing, status: ListingStatus.Active };
      listingsRepository.findOne.mockResolvedValue(activeListing);
      vehiclesRepository.findOne.mockResolvedValue(mockVehicle);

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

    it('should update listing with equipment array', async () => {
      const updateDto = {
        equipment: ['air_conditioning', 'navigation', 'parking_sensors', 'leather_seats'],
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
          equipment: ['air_conditioning', 'navigation', 'parking_sensors', 'leather_seats'],
        }),
      );
    });

    it('should update listing to remove equipment when empty array is provided', async () => {
      const updateDto = {
        equipment: [],
      };

      const activeListing = {
        ...mockListing,
        status: ListingStatus.Active,
        equipment: ['air_conditioning', 'navigation'],
      };
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
          equipment: [],
        }),
      );
    });
  });

  describe('autoCloseOldListings', () => {
    it('should close old listings and set closed_at', async () => {
      const mockPromotedListings = [{ id: 'listing-1' }, { id: 'listing-2' }] as Listing[];
      listingsRepository.find.mockResolvedValue(mockPromotedListings);
      promotionHistoryRepository.findOne.mockResolvedValue(null);

      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };
      listingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.autoCloseOldListings();

      expect(listingsRepository.find).toHaveBeenCalledWith({
        where: expect.any(Object),
        select: ['id'],
      });
      expect(listingsRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(Listing);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ListingStatus.Closed,
          closed_at: expect.any(Date),
          is_promoted: false,
          promoted_until: null,
          promoted_started_at: null,
          promoted_paused_at: null,
        }),
      );
      expect(result).toEqual({ closed: 3 });
    });
  });

  describe('refreshAllDates', () => {
    it('should update last_updated_at for all active listings of user', async () => {
      const userId = 'user-1';
      const updateResult: UpdateResult = { affected: 5, generatedMaps: [], raw: [] };
      usersService.getLastListingRefreshAt.mockResolvedValue(null);
      listingsRepository.update.mockResolvedValue(updateResult);
      usersService.update.mockResolvedValue({} as never);

      const result = await service.refreshAllDates(userId);

      expect(listingsRepository.update).toHaveBeenCalledWith(
        { user_id: userId, status: ListingStatus.Active },
        expect.objectContaining({
          last_updated_at: expect.any(Date),
        }),
      );
      expect(usersService.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ last_listing_refresh_at: expect.any(Date) }),
      );
      expect(result).toEqual({ updated: 5 });
    });

    it('should return 0 when no active listings found', async () => {
      const userId = 'user-1';
      const updateResult: UpdateResult = { affected: 0, generatedMaps: [], raw: [] };
      usersService.getLastListingRefreshAt.mockResolvedValue(null);
      listingsRepository.update.mockResolvedValue(updateResult);
      usersService.update.mockResolvedValue({} as never);

      const result = await service.refreshAllDates(userId);

      expect(result).toEqual({ updated: 0 });
    });

    it('should throw BadRequestException when last refresh was less than 48 hours ago', async () => {
      const userId = 'user-1';
      const recentRefresh = new Date(Date.now() - 24 * 60 * 60 * 1000);
      usersService.getLastListingRefreshAt.mockResolvedValue(recentRefresh);

      await expect(service.refreshAllDates(userId)).rejects.toThrow(BadRequestException);
      expect(listingsRepository.update).not.toHaveBeenCalled();
      expect(usersService.update).not.toHaveBeenCalled();
    });
  });

  describe('togglePromotion - P0: Critical Tests', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440001';
    const listingId = '550e8400-e29b-41d4-a716-446655440002';

    beforeEach(() => {
      process.env.MAX_PROMOTIONS_PER_USER = '10';
    });

    it('should enable promotion for active listing', async () => {
      const listing = {
        ...mockListing,
        id: listingId,
        user_id: userId,
        status: ListingStatus.Active,
        is_promoted: false,
        promoted_until: null,
        promoted_started_at: null,
      };

      listingsRepository.findOne.mockResolvedValue(listing);
      listingsRepository.count.mockResolvedValue(0);
      const savedDate = new Date();
      const untilDate = new Date();
      untilDate.setDate(untilDate.getDate() + 7);
      listingsRepository.save.mockResolvedValue({
        ...listing,
        is_promoted: true,
        promoted_until: untilDate,
        promoted_started_at: savedDate,
      });
      promotionHistoryRepository.save.mockResolvedValue({} as PromotionHistory);

      const result = await service.togglePromotion(listingId, userId, true, 7);

      expect(listingsRepository.findOne).toHaveBeenCalledWith({
        where: { id: listingId, user_id: userId },
      });
      expect(listingsRepository.count).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          is_promoted: true,
          status: ListingStatus.Active,
        },
      });
      expect(promotionHistoryRepository.save).toHaveBeenCalled();
      expect(result.is_promoted).toBe(true);
      expect(result.promoted_until).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if listing not found', async () => {
      listingsRepository.findOne.mockResolvedValue(null);

      await expect(service.togglePromotion(listingId, userId, true, 7)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if listing belongs to different user', async () => {
      const listing = {
        ...mockListing,
        id: listingId,
        user_id: '550e8400-e29b-41d4-a716-446655440003',
      };

      listingsRepository.findOne.mockResolvedValue(listing);

      await expect(service.togglePromotion(listingId, userId, true, 7)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if listing is not active when enabling promotion', async () => {
      const listing = {
        ...mockListing,
        id: listingId,
        user_id: userId,
        status: ListingStatus.Paused,
      };

      listingsRepository.findOne.mockResolvedValue(listing);

      await expect(service.togglePromotion(listingId, userId, true, 7)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid days', async () => {
      const listing = {
        ...mockListing,
        id: listingId,
        user_id: userId,
        status: ListingStatus.Active,
      };

      listingsRepository.findOne.mockResolvedValue(listing);

      await expect(service.togglePromotion(listingId, userId, true, 5)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when max promotions limit reached', async () => {
      const listing = {
        ...mockListing,
        id: listingId,
        user_id: userId,
        status: ListingStatus.Active,
      };

      listingsRepository.findOne.mockResolvedValue(listing);
      listingsRepository.count.mockResolvedValue(10);

      await expect(service.togglePromotion(listingId, userId, true, 7)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should disable promotion and update history', async () => {
      const listing = {
        ...mockListing,
        id: listingId,
        user_id: userId,
        status: ListingStatus.Active,
        is_promoted: true,
        promoted_until: new Date(),
        promoted_started_at: new Date(),
      };

      const historyRecord = {
        id: '550e8400-e29b-41d4-a716-446655440004',
        listing_id: listingId,
        ended_at: null,
      } as PromotionHistory;

      listingsRepository.findOne.mockResolvedValue(listing);
      promotionHistoryRepository.findOne.mockResolvedValue(historyRecord);
      promotionHistoryRepository.save.mockResolvedValue({
        ...historyRecord,
        ended_at: expect.any(Date),
      });
      listingsRepository.save.mockResolvedValue({
        ...listing,
        is_promoted: false,
        promoted_until: null,
        promoted_started_at: null,
      });

      const result = await service.togglePromotion(listingId, userId, false, 0);

      expect(promotionHistoryRepository.findOne).toHaveBeenCalled();
      expect(promotionHistoryRepository.save).toHaveBeenCalled();
      expect(result.is_promoted).toBe(false);
      expect(result.promoted_until).toBeNull();
    });

    it('should throw BadRequestException for invalid UUID format', async () => {
      await expect(service.togglePromotion('invalid-id', userId, true, 7)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getPromotionHistory - P1: Important Tests', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440001';

    it('should return paginated promotion history', async () => {
      const mockHistory = [
        {
          id: '550e8400-e29b-41d4-a716-446655440005',
          listing_id: '550e8400-e29b-41d4-a716-446655440002',
          user_id: userId,
          listing_title: 'Test Car',
          started_at: new Date(),
          ended_at: null,
          days: 7,
          listing: { status: ListingStatus.Active },
        },
      ] as any[];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockHistory, 1]),
      };

      promotionHistoryRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const result = await service.getPromotionHistory(userId, 1, 50);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
    });

    it('should return empty history when user has no promotions', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      promotionHistoryRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const result = await service.getPromotionHistory(userId);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('hasPromotionHistory - P1: Important Tests', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440001';

    it('should return true when user has promotion history', async () => {
      promotionHistoryRepository.count.mockResolvedValue(1);

      const result = await service.hasPromotionHistory(userId);

      expect(result).toBe(true);
      expect(promotionHistoryRepository.count).toHaveBeenCalledWith({
        where: { user_id: userId },
      });
    });

    it('should return false when user has no promotion history', async () => {
      promotionHistoryRepository.count.mockResolvedValue(0);

      const result = await service.hasPromotionHistory(userId);

      expect(result).toBe(false);
    });
  });
});
