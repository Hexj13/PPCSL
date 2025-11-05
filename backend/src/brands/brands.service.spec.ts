import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Favorite } from '../favorites/entities/favorite.entity';
import { ListingView } from '../listings/entities/listing-view.entity';
import { Listing } from '../listings/entities/listing.entity';
import { Vehicle } from '../listings/entities/vehicle.entity';

import { BrandsService } from './brands.service';
import { Brand } from './entities/brand.entity';
import { VehicleModel } from './entities/vehicle-model.entity';

describe('BrandsService', () => {
  let service: BrandsService;
  let brandsRepository: jest.Mocked<Repository<Brand>>;
  let modelsRepository: jest.Mocked<Repository<VehicleModel>>;
  let vehiclesRepository: jest.Mocked<Repository<Vehicle>>;
  let listingsRepository: jest.Mocked<Repository<Listing>>;
  let listingViewsRepository: jest.Mocked<Repository<ListingView>>;
  let favoritesRepository: jest.Mocked<Repository<Favorite>>;

  const mockBrand: Brand = {
    id: 'brand-1',
    name: 'Toyota',
    order: 1,
  } as Brand;

  const mockModel: VehicleModel = {
    id: 'model-1',
    name: 'Corolla',
    brand_id: 'brand-1',
    order: 1,
  } as VehicleModel;

  beforeEach(async () => {
    const mockBrandsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockModelsRepository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      remove: jest.fn(),
    };

    const mockVehiclesRepository = {
      find: jest.fn(),
      remove: jest.fn(),
    };

    const mockListingsRepository = {
      find: jest.fn(),
      remove: jest.fn(),
    };

    const mockListingViewsRepository = {
      find: jest.fn(),
      remove: jest.fn(),
    };

    const mockFavoritesRepository = {
      find: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsService,
        {
          provide: getRepositoryToken(Brand),
          useValue: mockBrandsRepository,
        },
        {
          provide: getRepositoryToken(VehicleModel),
          useValue: mockModelsRepository,
        },
        {
          provide: getRepositoryToken(Vehicle),
          useValue: mockVehiclesRepository,
        },
        {
          provide: getRepositoryToken(Listing),
          useValue: mockListingsRepository,
        },
        {
          provide: getRepositoryToken(ListingView),
          useValue: mockListingViewsRepository,
        },
        {
          provide: getRepositoryToken(Favorite),
          useValue: mockFavoritesRepository,
        },
      ],
    }).compile();

    service = module.get<BrandsService>(BrandsService);
    brandsRepository = module.get(getRepositoryToken(Brand));
    modelsRepository = module.get(getRepositoryToken(VehicleModel));
    vehiclesRepository = module.get(getRepositoryToken(Vehicle));
    listingsRepository = module.get(getRepositoryToken(Listing));
    listingViewsRepository = module.get(getRepositoryToken(ListingView));
    favoritesRepository = module.get(getRepositoryToken(Favorite));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all brands sorted by name', async () => {
      const brands = [mockBrand, { ...mockBrand, id: 'brand-2', name: 'BMW' }];
      brandsRepository.find.mockResolvedValue(brands);

      const result = await service.findAll();

      expect(result).toEqual(brands);
      expect(brandsRepository.find).toHaveBeenCalledWith({
        order: { name: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return brand by id with models', async () => {
      const brandWithModels = { ...mockBrand, models: [mockModel] };
      brandsRepository.findOne.mockResolvedValue(brandWithModels as Brand);

      const result = await service.findOne('brand-1');

      expect(result).toEqual(brandWithModels);
      expect(brandsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'brand-1' },
        relations: ['models'],
      });
    });
  });

  describe('findByName', () => {
    it('should return brand by name', async () => {
      brandsRepository.findOne.mockResolvedValue(mockBrand);

      const result = await service.findByName('Toyota');

      expect(result).toEqual(mockBrand);
      expect(brandsRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'Toyota' },
      });
    });
  });

  describe('getModelsByBrand', () => {
    it('should return models for brand', async () => {
      modelsRepository.find.mockResolvedValue([mockModel]);

      const result = await service.getModelsByBrand('brand-1');

      expect(result).toEqual([mockModel]);
      expect(modelsRepository.find).toHaveBeenCalledWith({
        where: { brand_id: 'brand-1' },
        order: { name: 'ASC' },
        relations: ['brand'],
      });
    });
  });

  describe('getModelsByBrandName', () => {
    it('should return models when brand exists', async () => {
      brandsRepository.findOne.mockResolvedValue(mockBrand);
      modelsRepository.find.mockResolvedValue([mockModel]);

      const result = await service.getModelsByBrandName('Toyota');

      expect(result).toEqual([mockModel]);
    });

    it('should return empty array when brand does not exist', async () => {
      brandsRepository.findOne.mockResolvedValue(null);

      const result = await service.getModelsByBrandName('NonExistent');

      expect(result).toEqual([]);
    });
  });

  describe('addModelsToBrand', () => {
    it('should add new models to brand', async () => {
      brandsRepository.findOne.mockResolvedValue(mockBrand);
      modelsRepository.find.mockResolvedValue([]);
      modelsRepository.create.mockReturnValue(mockModel);
      modelsRepository.save.mockResolvedValue(mockModel);
      modelsRepository.count.mockResolvedValue(1);

      const result = await service.addModelsToBrand('Toyota', ['Corolla']);

      expect(result.added).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.total).toBe(1);
    });

    it('should update existing models order', async () => {
      brandsRepository.findOne.mockResolvedValue(mockBrand);
      modelsRepository.find.mockResolvedValue([mockModel]);
      modelsRepository.save.mockResolvedValue(mockModel);
      modelsRepository.count.mockResolvedValue(1);

      const result = await service.addModelsToBrand('Toyota', ['Corolla']);

      expect(result.added).toBe(0);
      expect(result.updated).toBe(1);
    });

    it('should throw error when brand does not exist', async () => {
      brandsRepository.findOne.mockResolvedValue(null);

      await expect(service.addModelsToBrand('NonExistent', ['Model'])).rejects.toThrow();
    });
  });

  describe('deleteAll', () => {
    it('should delete all brands and related data', async () => {
      const mockVehicle = { id: 'vehicle-1', brand_id: 'brand-1' } as Vehicle;
      const mockListing = { id: 'listing-1', vehicle_id: 'vehicle-1' } as Listing;
      const mockView = { id: 'view-1', listing_id: 'listing-1' } as ListingView;
      const mockFavorite = { id: 'favorite-1', listing_id: 'listing-1' } as Favorite;

      brandsRepository.find.mockResolvedValue([mockBrand]);
      vehiclesRepository.find.mockResolvedValue([mockVehicle]);
      listingsRepository.find.mockResolvedValue([mockListing]);
      listingViewsRepository.find.mockResolvedValue([mockView]);
      favoritesRepository.find.mockResolvedValue([mockFavorite]);

      modelsRepository.find.mockResolvedValue([mockModel]);
      modelsRepository.remove.mockResolvedValue(mockModel);
      listingViewsRepository.remove.mockResolvedValue(mockView);
      favoritesRepository.remove.mockResolvedValue(mockFavorite);
      listingsRepository.remove.mockResolvedValue(mockListing);
      vehiclesRepository.remove.mockResolvedValue(mockVehicle);
      brandsRepository.remove = jest.fn().mockResolvedValue(mockBrand);

      const result = await service.deleteAll();

      expect(result.deletedBrands).toBe(1);
      expect(result.deletedModels).toBe(1);
      expect(result.deletedVehicles).toBe(1);
      expect(result.deletedListings).toBe(1);
    });
  });
});
