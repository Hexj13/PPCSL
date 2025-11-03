import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ListingsService } from './listings.service';
import { UsersService } from '../users/users.service';
import { BrandsService } from '../brands/brands.service';
import { Listing, ListingStatus, Currency } from './entities/listing.entity';
import { Vehicle } from './entities/vehicle.entity';

describe('ListingsService', () => {
  let service: ListingsService;
  let listingsRepository: jest.Mocked<Repository<Listing>>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let vehiclesRepository: jest.Mocked<Repository<Vehicle>>;
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
});
