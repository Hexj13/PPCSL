import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DeleteResult } from 'typeorm';

import { SavedFilter } from './entities/saved-filter.entity';
import { SavedFiltersService } from './saved-filters.service';

describe('SavedFiltersService', () => {
  let service: SavedFiltersService;
  let repository: jest.Mocked<Repository<SavedFilter>>;

  const mockSavedFilter: SavedFilter = {
    id: 'filter-1',
    user_id: 'user-1',
    name: 'Мој филтер',
    filters: { brand_ids: ['brand-1'], price_gte: '10000' },
    created_at: new Date(),
  } as SavedFilter;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavedFiltersService,
        {
          provide: getRepositoryToken(SavedFilter),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SavedFiltersService>(SavedFiltersService);
    repository = module.get(getRepositoryToken(SavedFilter));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create new saved filter when under limit', async () => {
      repository.count.mockResolvedValue(5);
      repository.create.mockReturnValue(mockSavedFilter);
      repository.save.mockResolvedValue(mockSavedFilter);

      const result = await service.create('user-1', 'Мој филтер', {
        brand_ids: ['brand-1'],
        price_gte: '10000',
      });

      expect(result).toEqual(mockSavedFilter);
      expect(repository.count).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
      });
      expect(repository.create).toHaveBeenCalledWith({
        user_id: 'user-1',
        name: 'Мој филтер',
        filters: { brand_ids: ['brand-1'], price_gte: '10000' },
      });
      expect(repository.save).toHaveBeenCalledWith(mockSavedFilter);
    });

    it('should throw BadRequestException when limit reached', async () => {
      repository.count.mockResolvedValue(20);

      await expect(
        service.create('user-1', 'Мој филтер', { brand_ids: ['brand-1'] }),
      ).rejects.toThrow(BadRequestException);

      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when exactly at limit', async () => {
      repository.count.mockResolvedValue(20);

      await expect(
        service.create('user-1', 'Мој филтер', { brand_ids: ['brand-1'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all saved filters for user ordered by created_at DESC', async () => {
      const mockFilters = [
        { ...mockSavedFilter, id: 'filter-1', created_at: new Date('2024-01-02') },
        { ...mockSavedFilter, id: 'filter-2', created_at: new Date('2024-01-01') },
      ];
      repository.find.mockResolvedValue(mockFilters as SavedFilter[]);

      const result = await service.findAll('user-1');

      expect(result).toEqual(mockFilters);
      expect(repository.find).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        order: { created_at: 'DESC' },
      });
    });

    it('should return empty array when no filters exist', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update saved filter name', async () => {
      const updatedFilter = { ...mockSavedFilter, name: 'Ново име' };
      repository.findOne.mockResolvedValue(mockSavedFilter);
      repository.save.mockResolvedValue(updatedFilter as SavedFilter);

      const result = await service.update('user-1', 'filter-1', 'Ново име');

      expect(result).toEqual(updatedFilter);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'filter-1', user_id: 'user-1' },
      });
      expect(mockSavedFilter.name).toBe('Ново име');
      expect(repository.save).toHaveBeenCalledWith(mockSavedFilter);
    });

    it('should throw BadRequestException when filter not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('user-1', 'filter-1', 'Ново име')).rejects.toThrow(
        BadRequestException,
      );

      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when filter belongs to different user', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('user-2', 'filter-1', 'Ново име')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should remove saved filter successfully', async () => {
      const deleteResult: DeleteResult = { affected: 1, raw: [] };
      repository.delete.mockResolvedValue(deleteResult);

      await service.remove('user-1', 'filter-1');

      expect(repository.delete).toHaveBeenCalledWith({
        id: 'filter-1',
        user_id: 'user-1',
      });
    });

    it('should throw BadRequestException when filter not found', async () => {
      const deleteResult: DeleteResult = { affected: 0, raw: [] };
      repository.delete.mockResolvedValue(deleteResult);

      await expect(service.remove('user-1', 'filter-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when filter belongs to different user', async () => {
      const deleteResult: DeleteResult = { affected: 0, raw: [] };
      repository.delete.mockResolvedValue(deleteResult);

      await expect(service.remove('user-2', 'filter-1')).rejects.toThrow(BadRequestException);
    });
  });
});
