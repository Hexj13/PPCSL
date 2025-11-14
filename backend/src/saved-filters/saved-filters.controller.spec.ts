import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CreateSavedFilterDto } from './dto/create-saved-filter.dto';
import { UpdateSavedFilterDto } from './dto/update-saved-filter.dto';
import { SavedFilter } from './entities/saved-filter.entity';
import { SavedFiltersController } from './saved-filters.controller';
import { SavedFiltersService } from './saved-filters.service';

describe('SavedFiltersController', () => {
  let controller: SavedFiltersController;
  let service: jest.Mocked<SavedFiltersService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
  };

  const mockSavedFilter: SavedFilter = {
    id: 'filter-1',
    user_id: 'user-1',
    user: undefined as any,
    name: 'Мој филтер',
    filters: { brand_ids: ['brand-1'], price_gte: '10000' },
    created_at: new Date(),
  } as SavedFilter;

  const mockRequest = {
    user: mockUser,
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SavedFiltersController],
      providers: [
        {
          provide: SavedFiltersService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<SavedFiltersController>(SavedFiltersController);
    service = module.get(SavedFiltersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create saved filter', async () => {
      const createDto: CreateSavedFilterDto = {
        name: 'Мој филтер',
        filters: { brand_ids: ['brand-1'], price_gte: '10000' },
      };
      service.create.mockResolvedValue(mockSavedFilter);

      const result = await controller.create(createDto, mockRequest);

      expect(result).toEqual(mockSavedFilter);
      expect(service.create).toHaveBeenCalledWith('user-1', 'Мој филтер', createDto.filters);
    });

    it('should throw BadRequestException when limit reached', async () => {
      const createDto: CreateSavedFilterDto = {
        name: 'Мој филтер',
        filters: { brand_ids: ['brand-1'] },
      };
      service.create.mockRejectedValue(
        new BadRequestException('Можете да зачувате максимум 20 филтри.'),
      );

      await expect(controller.create(createDto, mockRequest)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all saved filters for user', async () => {
      const mockFilters = [mockSavedFilter];
      service.findAll.mockResolvedValue(mockFilters);

      const result = await controller.findAll(mockRequest);

      expect(result).toEqual(mockFilters);
      expect(service.findAll).toHaveBeenCalledWith('user-1');
    });

    it('should return empty array when no filters', async () => {
      service.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockRequest);

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update saved filter name', async () => {
      const updateDto: UpdateSavedFilterDto = { name: 'Ново име' };
      const updatedFilter = { ...mockSavedFilter, name: 'Ново име' };
      service.update.mockResolvedValue(updatedFilter);

      const result = await controller.update('filter-1', updateDto, mockRequest);

      expect(result).toEqual(updatedFilter);
      expect(service.update).toHaveBeenCalledWith('user-1', 'filter-1', 'Ново име');
    });

    it('should throw BadRequestException when filter not found', async () => {
      const updateDto: UpdateSavedFilterDto = { name: 'Ново име' };
      service.update.mockRejectedValue(new BadRequestException('Филтерот не е пронајден'));

      await expect(controller.update('filter-1', updateDto, mockRequest)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should remove saved filter', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('filter-1', mockRequest);

      expect(service.remove).toHaveBeenCalledWith('user-1', 'filter-1');
    });

    it('should throw BadRequestException when filter not found', async () => {
      service.remove.mockRejectedValue(new BadRequestException('Филтерот не е пронајден'));

      await expect(controller.remove('filter-1', mockRequest)).rejects.toThrow(BadRequestException);
    });
  });
});
