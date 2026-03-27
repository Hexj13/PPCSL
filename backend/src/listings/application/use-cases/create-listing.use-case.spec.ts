import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { BrandsService } from '../../../brands/brands.service';
import { ListingCategory } from '../../../common/constants';
import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { I18nService } from '../../../common/i18n/i18n.service';
import { TireBrand } from '../../../tires/entities/tire-brand.entity';
import { TireModel } from '../../../tires/entities/tire-model.entity';
import { User } from '../../../users/entities/user.entity';
import { UsersService } from '../../../users/application/users.service';
import { ListingTitleService } from '../../domain/services/listing-title.service';
import { Listing } from '../../entities/listing.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { CreateListingDto } from '../../presentation/dto/create-listing.dto';
import { CreateVehicleDto } from '../../presentation/dto/create-vehicle.dto';
import { IListingCache } from '../ports/listing-cache.port';
import { IListingRepository } from '../ports/listing.repository.port';

import { CreateListingUseCase } from './create-listing.use-case';

const testVehicle: CreateVehicleDto = {
  brand_id: 'brand-1',
  model_id: 'model-1',
  year: 2020,
  body_type: 'Sedan',
  drive_type: 'FWD',
};

const minimalDto: CreateListingDto = {
  price: 10000,
  city: 'City',
  condition: 'Undamaged',
  registration_type: 'Local',
  horsepower: 150,
  vehicle: testVehicle,
};

function createUseCase(mocks: {
  listingRepo?: Partial<IListingRepository>;
  listingCache?: Partial<IListingCache>;
  titleService?: Partial<ListingTitleService>;
  usersService?: Partial<UsersService>;
  brandsService?: Partial<BrandsService>;
  i18nService?: Partial<I18nService>;
  tireModelRepository?: Partial<Repository<TireModel>>;
  tireBrandRepository?: Partial<Repository<TireBrand>>;
}) {
  const listingRepo = {
    save: jest.fn(),
    countActiveByUser: jest.fn().mockResolvedValue(0),
    findById: jest.fn(),
    search: jest.fn(),
    countPromotedByUser: jest.fn(),
    findByVin: jest.fn(),
    findSimilarCandidates: jest.fn(),
    ...mocks.listingRepo,
  };
  const listingCache = {
    invalidateSearch: jest.fn().mockResolvedValue(undefined),
    invalidateSingle: jest.fn().mockResolvedValue(undefined),
    getSearchResults: jest.fn(),
    setSearchResults: jest.fn(),
    getSingle: jest.fn(),
    setSingle: jest.fn(),
    getSimilarResults: jest.fn(),
    setSimilarResults: jest.fn(),
    ...mocks.listingCache,
  };
  const titleService = {
    generate: jest.fn().mockResolvedValue('Generated Title'),
    generateForTire: jest.fn().mockReturnValue('Tire Listing Title'),
    ...mocks.titleService,
  };
  const usersService = {
    findOneById: jest.fn(),
    getListingLimit: jest.fn().mockResolvedValue(100),
    ...mocks.usersService,
  };
  const brandsService = {
    findOne: jest.fn().mockResolvedValue({ name: 'Brand' }),
    getModelsByBrand: jest.fn().mockResolvedValue([{ id: 'model-1', name: 'Model' }]),
    ...mocks.brandsService,
  };
  const i18nService = {
    translate: jest.fn((key: string) => key),
    ...mocks.i18nService,
  };

  const tireModelRepository = {
    findOne: jest.fn(),
    ...mocks.tireModelRepository,
  };

  const tireBrandRepository = {
    findOne: jest.fn().mockResolvedValue({ id: 'tb-1', name: 'Tire Brand', is_archived: false }),
    ...mocks.tireBrandRepository,
  };

  const useCase = new CreateListingUseCase(
    listingRepo as IListingRepository,
    listingCache as IListingCache,
    titleService as ListingTitleService,
    usersService as UsersService,
    brandsService as BrandsService,
    i18nService as I18nService,
    tireModelRepository as Repository<TireModel>,
    tireBrandRepository as Repository<TireBrand>,
  );

  return {
    useCase,
    listingRepo,
    listingCache,
    titleService,
    usersService,
    brandsService,
    i18nService,
    tireModelRepository,
  };
}

describe('CreateListingUseCase', () => {
  describe('execute', () => {
    it('should create listing with caller as owner when assignedUserId is not set', async () => {
      const { useCase, listingRepo } = createUseCase({});
      (listingRepo.save as jest.Mock).mockImplementation((listing: Listing) =>
        Promise.resolve({
          ...listing,
          id: 'listing-1',
          user_id: 'user-1',
          title: 'Generated Title',
          status: ListingStatusEnum.Active,
        }),
      );

      const result = await useCase.execute(minimalDto, 'user-1');

      expect(result.user_id).toBe('user-1');
      expect(listingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
        }),
      );
    });

    it('should create listing with Electric fuel and without engine_displ_l', async () => {
      const { useCase, listingRepo } = createUseCase({});
      (listingRepo.save as jest.Mock).mockImplementation((listing: Listing) =>
        Promise.resolve({ ...listing, id: 'listing-1' }),
      );
      const dto: CreateListingDto = {
        ...minimalDto,
        vehicle: {
          ...testVehicle,
          fuel: 'Electric',
        },
      };

      const result = await useCase.execute(dto, 'user-1');

      expect(result.id).toBe('listing-1');
      const savedListing = (listingRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedListing.vehicle.fuel).toBe('Electric');
      expect(savedListing.vehicle.engine_displ_l).toBeNull();
    });

    it('should clear engine_displ_l when Electric fuel is sent with engine value', async () => {
      const { useCase, listingRepo } = createUseCase({});
      (listingRepo.save as jest.Mock).mockImplementation((listing: Listing) =>
        Promise.resolve({ ...listing, id: 'listing-1' }),
      );
      const dto: CreateListingDto = {
        ...minimalDto,
        vehicle: {
          ...testVehicle,
          fuel: 'Electric',
          engine_displ_l: 2.0,
        },
      };

      await useCase.execute(dto, 'user-1');

      const savedListing = (listingRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedListing.vehicle.fuel).toBe('Electric');
      expect(savedListing.vehicle.engine_displ_l).toBeNull();
    });

    it('should create listing with caller as owner when assignedUserId is empty and userType omitted', async () => {
      const { useCase, listingRepo } = createUseCase({});
      (listingRepo.save as jest.Mock).mockImplementation((listing: Listing) =>
        Promise.resolve({ ...listing, id: 'listing-1' }),
      );

      await useCase.execute(minimalDto, 'user-1');

      expect(listingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
        }),
      );
    });

    it('should throw ForbiddenException when non-admin sends assignedUserId', async () => {
      const { useCase, usersService } = createUseCase({});
      const dto = { ...minimalDto, assignedUserId: 'target-user-id' };

      await expect(useCase.execute(dto, 'user-1', 'Individual')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(useCase.execute(dto, 'user-1', 'Individual')).rejects.toThrow(
        'errors.accessDenied',
      );
      expect(usersService.findOneById).not.toHaveBeenCalled();
    });

    it('should create listing with target user as owner when admin sets assignedUserId', async () => {
      const targetUser = {
        id: 'target-user-id',
        active: true,
        type: 'Individual',
      } as User;
      const { useCase, listingRepo, usersService } = createUseCase({
        usersService: {
          findOneById: jest.fn().mockResolvedValue(targetUser),
          getListingLimit: jest.fn().mockResolvedValue(100),
        },
      });
      (listingRepo.save as jest.Mock).mockImplementation((listing: Listing) =>
        Promise.resolve({ ...listing, id: 'listing-1' }),
      );
      const dto = { ...minimalDto, assignedUserId: 'target-user-id' };

      const result = await useCase.execute(dto, 'admin-user-id', 'Admin');

      expect(usersService.findOneById).toHaveBeenCalledWith('target-user-id');
      expect(result.user_id).toBe('target-user-id');
      expect(listingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'target-user-id',
        }),
      );
    });

    it('should throw BadRequestException when assigned user is deactivated', async () => {
      const targetUser = { id: 'target-user-id', active: false } as User;
      const { useCase, usersService } = createUseCase({
        usersService: {
          findOneById: jest.fn().mockResolvedValue(targetUser),
          getListingLimit: jest.fn().mockResolvedValue(100),
        },
      });
      const dto = { ...minimalDto, assignedUserId: 'target-user-id' };

      await expect(useCase.execute(dto, 'admin-id', 'Admin')).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(dto, 'admin-id', 'Admin')).rejects.toThrow(
        'errors.assignedUserDeactivated',
      );
    });

    it('should throw when assigned user does not exist', async () => {
      const { useCase, usersService } = createUseCase({
        usersService: {
          findOneById: jest.fn().mockRejectedValue(new NotFoundException('errors.userNotFound')),
          getListingLimit: jest.fn().mockResolvedValue(100),
        },
      });
      const dto = { ...minimalDto, assignedUserId: 'non-existent-id' };

      await expect(useCase.execute(dto, 'admin-id', 'Admin')).rejects.toThrow(NotFoundException);
      await expect(useCase.execute(dto, 'admin-id', 'Admin')).rejects.toThrow(
        'errors.userNotFound',
      );
    });

    it('should throw BadRequestException when target user is at listing limit', async () => {
      const targetUser = { id: 'target-user-id', active: true } as User;
      const { useCase, listingRepo, usersService } = createUseCase({
        listingRepo: {
          save: jest.fn(),
          countActiveByUser: jest.fn().mockResolvedValue(100),
          findById: jest.fn(),
          search: jest.fn(),
          countPromotedByUser: jest.fn(),
          findByVin: jest.fn(),
          findSimilarCandidates: jest.fn(),
        },
        usersService: {
          findOneById: jest.fn().mockResolvedValue(targetUser),
          getListingLimit: jest.fn().mockResolvedValue(100),
        },
      });
      const dto = {
        ...minimalDto,
        assignedUserId: 'target-user-id',
        status: ListingStatusEnum.Active,
      };

      await expect(useCase.execute(dto, 'admin-id', 'Admin')).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(dto, 'admin-id', 'Admin')).rejects.toThrow(
        'errors.activeListingsLimitExceeded',
      );
    });

    it('should create tire listing when tire payload is sent without explicit category', async () => {
      const brandId = '00000000-0000-0000-0000-000000000001';
      const modelId = '00000000-0000-0000-0000-000000000002';
      const { useCase, listingRepo, tireModelRepository } = createUseCase({
        tireModelRepository: {
          findOne: jest.fn().mockResolvedValue({
            id: modelId,
            brand_id: brandId,
            name: 'Alpin',
            is_other: false,
            is_archived: false,
            brand: { id: brandId, name: 'Michelin' },
          }),
        },
      });
      (listingRepo.save as jest.Mock).mockImplementation((listing: Listing) =>
        Promise.resolve({ ...listing, id: 'listing-tire-1' }),
      );

      const dto: CreateListingDto = {
        price: 400,
        city: 'Chișinău',
        tire: {
          brand_id: brandId,
          model_id: modelId,
          tire_vehicle_type: 'car',
          season: 'summer',
          condition: 'used',
          width_mm: 205,
          aspect_ratio: 55,
          diameter_inch: 16,
          quantity: 4,
        },
      };

      const result = await useCase.execute(dto, 'user-1');

      expect(result.id).toBe('listing-tire-1');
      expect(tireModelRepository.findOne).toHaveBeenCalled();
      expect(listingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ListingCategory.Tire,
          user_id: 'user-1',
        }),
      );
    });

    it('should create listing for admin when assignedUserId is admin own id', async () => {
      const adminUser = { id: 'admin-id', active: true } as User;
      const { useCase, listingRepo, usersService } = createUseCase({
        usersService: {
          findOneById: jest.fn().mockResolvedValue(adminUser),
          getListingLimit: jest.fn().mockResolvedValue(100),
        },
      });
      (listingRepo.save as jest.Mock).mockImplementation((listing: Listing) =>
        Promise.resolve({ ...listing, id: 'listing-1' }),
      );
      const dto = { ...minimalDto, assignedUserId: 'admin-id' };

      const result = await useCase.execute(dto, 'admin-id', 'Admin');

      expect(result.user_id).toBe('admin-id');
    });
  });
});
