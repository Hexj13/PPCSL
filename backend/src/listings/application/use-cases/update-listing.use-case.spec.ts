import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BRANDS_CACHE } from '../../../brands/application/ports/brands-cache.port';
import { BrandsService } from '../../../brands/brands.service';
import { ListingCategory } from '../../../common/constants';
import { I18nService } from '../../../common/i18n/i18n.service';
import { TireBrand } from '../../../tires/entities/tire-brand.entity';
import { Tire } from '../../../tires/entities/tire.entity';
import { TireModel } from '../../../tires/entities/tire-model.entity';
import { UploadService } from '../../../upload/upload.service';

jest.mock('../../../upload/upload.service', () => ({
  UploadService: jest.fn().mockImplementation(() => ({
    deleteFile: jest.fn().mockResolvedValue(undefined),
  })),
}));
import { ListingTitleService } from '../../domain/services/listing-title.service';
import { Listing } from '../../entities/listing.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { UpdateListingDto } from '../../presentation/dto/update-listing.dto';
import { LISTING_CACHE } from '../ports/listing-cache.port';
import { ListingAiReportService } from '../listing-ai-report.service';

import { UpdateListingUseCase } from './update-listing.use-case';

describe('UpdateListingUseCase', () => {
  let useCase: UpdateListingUseCase;
  let listingsRepository: jest.Mocked<Repository<Listing>>;
  let vehiclesRepository: jest.Mocked<Repository<Vehicle>>;
  let tiresRepository: jest.Mocked<Repository<Tire>>;
  let tireModelsRepository: jest.Mocked<Repository<TireModel>>;
  let tireBrandsRepository: jest.Mocked<Repository<TireBrand>>;
  let uploadService: jest.Mocked<Pick<UploadService, 'deleteFile'>>;

  const listingId = 'listing-1';
  const userId = 'user-1';
  const vehicleId = 'vehicle-1';
  const existingListing: Partial<Listing> = {
    id: listingId,
    user_id: userId,
    status: 'Active',
    category: ListingCategory.Vehicle,
    vehicle_id: vehicleId,
    images: [
      'https://example.com/uploads/abc.webp',
      'https://example.com/uploads/def.webp',
      '/uploads/ghi.webp',
    ],
  };
  const existingVehicle: Partial<Vehicle> = {
    id: vehicleId,
    brand_id: 'brand-1',
    model_id: 'model-1',
    year: 2020,
    transmission: 'Manual',
  };

  beforeEach(async () => {
    const deleteFileMock = jest.fn().mockResolvedValue(undefined);
    uploadService = { deleteFile: deleteFileMock };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateListingUseCase,
        {
          provide: getRepositoryToken(Listing),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn().mockResolvedValue(undefined),
            manager: {
              connection: { queryResultCache: { remove: jest.fn().mockResolvedValue(undefined) } },
            },
          },
        },
        {
          provide: getRepositoryToken(Vehicle),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn().mockResolvedValue(undefined),
            manager: {
              connection: { queryResultCache: { remove: jest.fn().mockResolvedValue(undefined) } },
            },
          },
        },
        {
          provide: getRepositoryToken(Tire),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TireModel),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TireBrand),
          useValue: {
            exist: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: BrandsService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({ name: 'Brand' }),
            getModelsByBrand: jest.fn().mockResolvedValue([{ id: 'model-1', name: 'Model' }]),
          },
        },
        {
          provide: I18nService,
          useValue: { translate: jest.fn((key: string) => key) },
        },
        {
          provide: ListingTitleService,
          useValue: {
            generate: jest.fn().mockResolvedValue('Generated Title'),
            generateForTire: jest.fn().mockReturnValue('Tire Title'),
          },
        },
        { provide: UploadService, useValue: uploadService },
        {
          provide: LISTING_CACHE,
          useValue: {
            invalidateSearch: jest.fn(),
            invalidateSingle: jest.fn(),
            invalidateSimilar: jest.fn(),
          },
        },
        {
          provide: BRANDS_CACHE,
          useValue: { invalidateModels: jest.fn() },
        },
        {
          provide: ListingAiReportService,
          useValue: { deleteByListingId: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    useCase = module.get(UpdateListingUseCase);
    listingsRepository = module.get(getRepositoryToken(Listing));
    vehiclesRepository = module.get(getRepositoryToken(Vehicle));
    tiresRepository = module.get(getRepositoryToken(Tire));
    tireModelsRepository = module.get(getRepositoryToken(TireModel));
    tireBrandsRepository = module.get(getRepositoryToken(TireBrand));

    (listingsRepository.findOne as jest.Mock)
      .mockResolvedValueOnce({
        ...existingListing,
        category: ListingCategory.Vehicle,
        vehicle: { id: vehicleId },
      })
      .mockResolvedValueOnce({
        ...existingListing,
        category: ListingCategory.Vehicle,
        vehicle: { ...existingVehicle, brand: {}, model: {} },
        user: {},
      });
    (vehiclesRepository.findOne as jest.Mock).mockResolvedValue({
      ...existingVehicle,
      brand: {},
      model: {},
    });
  });

  it('should call deleteFile for each removed image when images array is updated', async () => {
    const newImages = [
      'https://example.com/uploads/abc.webp',
      'https://example.com/uploads/kept-second.webp',
    ];
    const dto: UpdateListingDto = {
      images: newImages,
    };

    await useCase.execute(listingId, dto, userId);

    expect(uploadService.deleteFile).toHaveBeenCalledTimes(2);
    expect(uploadService.deleteFile).toHaveBeenCalledWith('/uploads/def.webp');
    expect(uploadService.deleteFile).toHaveBeenCalledWith('/uploads/ghi.webp');
  });

  it('should not call deleteFile when images are unchanged', async () => {
    const dto: UpdateListingDto = {
      images: existingListing.images as string[],
    };

    await useCase.execute(listingId, dto, userId);

    expect(uploadService.deleteFile).not.toHaveBeenCalled();
  });

  it('should not call deleteFile when updateListingDto.images is not provided', async () => {
    await useCase.execute(listingId, {}, userId);

    expect(uploadService.deleteFile).not.toHaveBeenCalled();
  });

  it('should not block update when deleteFile fails for an orphaned image', async () => {
    uploadService.deleteFile
      .mockRejectedValueOnce(new Error('S3 error'))
      .mockResolvedValueOnce(undefined);

    const newImages = [
      'https://example.com/uploads/abc.webp',
      'https://example.com/uploads/kept-second.webp',
    ];
    const dto: UpdateListingDto = { images: newImages };

    await expect(useCase.execute(listingId, dto, userId)).resolves.toBeDefined();
    expect(uploadService.deleteFile).toHaveBeenCalledTimes(2);
  });

  it('should throw ForbiddenException when user does not own the listing', async () => {
    await expect(useCase.execute(listingId, {}, 'other-user')).rejects.toThrow(ForbiddenException);
    expect(uploadService.deleteFile).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when listing does not exist', async () => {
    (listingsRepository.findOne as jest.Mock).mockReset().mockResolvedValue(null);

    await expect(useCase.execute('nonexistent', {}, userId)).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException when listing is closed', async () => {
    (listingsRepository.findOne as jest.Mock).mockReset().mockResolvedValueOnce({
      ...existingListing,
      category: ListingCategory.Vehicle,
      status: 'Closed',
      vehicle: { id: vehicleId },
    });

    await expect(useCase.execute(listingId, {}, userId)).rejects.toThrow(BadRequestException);
  });

  it('should allow admin to update listing when user does not own it', async () => {
    await expect(useCase.execute(listingId, {}, 'other-user', 'Admin')).resolves.toBeDefined();
    expect(uploadService.deleteFile).not.toHaveBeenCalled();
  });

  it('should allow admin to update closed listing', async () => {
    (listingsRepository.findOne as jest.Mock).mockReset().mockResolvedValueOnce({
      ...existingListing,
      category: ListingCategory.Vehicle,
      status: 'Closed',
      vehicle: { id: vehicleId },
    });

    (listingsRepository.findOne as jest.Mock).mockResolvedValueOnce({
      ...existingListing,
      category: ListingCategory.Vehicle,
      status: 'Closed',
      vehicle: { ...existingVehicle, brand: {}, model: {} },
      user: {},
    });

    await expect(useCase.execute(listingId, {}, userId, 'Admin')).resolves.toBeDefined();
  });

  describe('tire listing updates', () => {
    const tireListingId = 'listing-tire-1';
    const tireId = 'tire-1';
    const tireBrandId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
    const oldTireModelId = '1b9d6bcd-bbfd-4b2d-9b5d-ab8df273da29';
    const otherTireModelId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

    const baseTireRow: Tire = {
      id: tireId,
      brand_id: tireBrandId,
      model_id: oldTireModelId,
      brand: undefined as unknown as TireBrand,
      model: undefined as unknown as TireModel,
      tire_vehicle_type: 'car',
      season: 'summer',
      condition: 'new',
      width_mm: 205,
      aspect_ratio: 55,
      diameter_inch: 16,
      quantity: 4,
      load_index: null,
      speed_index: null,
      dot_year: null,
      tread_depth_mm: null,
      studded: false,
      run_flat: false,
      reinforced_xl: false,
      spare_donut: false,
      tubeless: false,
      acoustic: false,
    };

    const otherModelRow: TireModel = {
      id: otherTireModelId,
      brand_id: tireBrandId,
      brand: undefined as unknown as TireBrand,
      name: 'Other',
      name_normalized: 'other',
      order: 0,
      is_archived: false,
      is_other: true,
      created_at: new Date(),
    };

    beforeEach(() => {
      (listingsRepository.findOne as jest.Mock).mockReset();
      (tiresRepository.findOne as jest.Mock).mockReset();
      (tiresRepository.save as jest.Mock).mockReset();
      (tireModelsRepository.findOne as jest.Mock).mockReset();
      (tireBrandsRepository.exist as jest.Mock).mockReset().mockResolvedValue(true);
      (listingsRepository.update as jest.Mock).mockReset().mockResolvedValue(undefined);
    });

    it('should persist tire model_id when switching to catalog Other (is_other)', async () => {
      const tireListing: Partial<Listing> = {
        id: tireListingId,
        user_id: userId,
        status: 'Active',
        category: ListingCategory.Tire,
        tire_id: tireId,
        images: ['https://example.com/uploads/tire.webp'],
      };

      (listingsRepository.findOne as jest.Mock)
        .mockResolvedValueOnce({ ...tireListing, tire: { id: tireId } })
        .mockResolvedValueOnce({
          ...tireListing,
          tire: {
            ...baseTireRow,
            model_id: otherTireModelId,
            brand: { id: tireBrandId, name: 'Michelin' },
            model: otherModelRow,
          },
          user: {},
        });

      (tiresRepository.findOne as jest.Mock)
        .mockResolvedValueOnce({ ...baseTireRow })
        .mockResolvedValueOnce({
          ...baseTireRow,
          model_id: otherTireModelId,
          brand: { id: tireBrandId, name: 'Michelin' },
          model: otherModelRow,
        });

      (tireModelsRepository.findOne as jest.Mock).mockImplementation(
        (opts: { where: { id: string } }) => {
          if (opts.where.id === otherTireModelId) {
            return Promise.resolve(otherModelRow);
          }
          return Promise.resolve(null);
        },
      );

      (tiresRepository.save as jest.Mock).mockImplementation((entity: Tire) =>
        Promise.resolve(entity),
      );

      const dto: UpdateListingDto = {
        price: 1000,
        currency: 'EUR',
        city: 'Chisinau',
        negotiable: false,
        description: 'd',
        images: ['https://example.com/uploads/tire.webp'],
        tire: {
          model_id: otherTireModelId,
          brand_id: tireBrandId,
          tire_vehicle_type: 'car',
          season: 'summer',
          condition: 'new',
          width_mm: 205,
          aspect_ratio: 55,
          diameter_inch: 16,
          quantity: 4,
        },
      };

      await useCase.execute(tireListingId, dto, userId);

      expect(tiresRepository.save).toHaveBeenCalledTimes(1);
      expect(tiresRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ model_id: otherTireModelId }),
      );
      expect(tireBrandsRepository.exist).toHaveBeenCalledWith({
        where: { id: tireBrandId, is_archived: false },
      });
    });
  });
});
