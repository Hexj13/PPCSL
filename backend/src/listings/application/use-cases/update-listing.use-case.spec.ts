import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BRANDS_CACHE } from '../../../brands/application/ports/brands-cache.port';
import { BrandsService } from '../../../brands/brands.service';
import { I18nService } from '../../../common/i18n/i18n.service';
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

import { UpdateListingUseCase } from './update-listing.use-case';

describe('UpdateListingUseCase', () => {
  let useCase: UpdateListingUseCase;
  let listingsRepository: jest.Mocked<Repository<Listing>>;
  let vehiclesRepository: jest.Mocked<Repository<Vehicle>>;
  let uploadService: jest.Mocked<Pick<UploadService, 'deleteFile'>>;

  const listingId = 'listing-1';
  const userId = 'user-1';
  const vehicleId = 'vehicle-1';
  const existingListing: Partial<Listing> = {
    id: listingId,
    user_id: userId,
    status: 'Active',
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
          useValue: { generate: jest.fn().mockResolvedValue('Generated Title') },
        },
        { provide: UploadService, useValue: uploadService },
        {
          provide: LISTING_CACHE,
          useValue: { invalidateSearch: jest.fn(), invalidateSingle: jest.fn() },
        },
        {
          provide: BRANDS_CACHE,
          useValue: { invalidateModels: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(UpdateListingUseCase);
    listingsRepository = module.get(getRepositoryToken(Listing));
    vehiclesRepository = module.get(getRepositoryToken(Vehicle));

    (listingsRepository.findOne as jest.Mock)
      .mockResolvedValueOnce({ ...existingListing, vehicle: { id: vehicleId } })
      .mockResolvedValueOnce({
        ...existingListing,
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
    const newImages = ['https://example.com/uploads/abc.webp'];
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

    const newImages = ['https://example.com/uploads/abc.webp'];
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
    (listingsRepository.findOne as jest.Mock)
      .mockReset()
      .mockResolvedValueOnce({ ...existingListing, status: 'Closed', vehicle: { id: vehicleId } });

    await expect(useCase.execute(listingId, {}, userId)).rejects.toThrow(BadRequestException);
  });
});
