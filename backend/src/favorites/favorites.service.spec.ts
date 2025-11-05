import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DeleteResult } from 'typeorm';

import { Favorite } from './entities/favorite.entity';
import { FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let repository: jest.Mocked<Repository<Favorite>>;

  const mockFavorite: Favorite = {
    id: 'favorite-1',
    user_id: 'user-1',
    listing_id: 'listing-1',
    created_at: new Date(),
  } as Favorite;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        {
          provide: getRepositoryToken(Favorite),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
    repository = module.get(getRepositoryToken(Favorite));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('add', () => {
    it('should create new favorite when not exists', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockFavorite);
      repository.save.mockResolvedValue(mockFavorite);

      const result = await service.add('user-1', 'listing-1');

      expect(result).toEqual(mockFavorite);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { user_id: 'user-1', listing_id: 'listing-1' },
      });
      expect(repository.create).toHaveBeenCalledWith({
        user_id: 'user-1',
        listing_id: 'listing-1',
      });
      expect(repository.save).toHaveBeenCalledWith(mockFavorite);
    });

    it('should return existing favorite when already exists', async () => {
      repository.findOne.mockResolvedValue(mockFavorite);

      const result = await service.add('user-1', 'listing-1');

      expect(result).toEqual(mockFavorite);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove favorite successfully', async () => {
      const deleteResult: DeleteResult = { affected: 1, raw: [] };
      repository.delete.mockResolvedValue(deleteResult);

      await service.remove('user-1', 'listing-1');

      expect(repository.delete).toHaveBeenCalledWith({
        user_id: 'user-1',
        listing_id: 'listing-1',
      });
    });

    it('should throw NotFoundException when favorite not found', async () => {
      const deleteResult: DeleteResult = { affected: 0, raw: [] };
      repository.delete.mockResolvedValue(deleteResult);

      await expect(service.remove('user-1', 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all favorites for user', async () => {
      const favorites = [mockFavorite];
      repository.find.mockResolvedValue(favorites);

      const result = await service.findAll('user-1');

      expect(result).toEqual(favorites);
      expect(repository.find).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        relations: [
          'listing',
          'listing.vehicle',
          'listing.vehicle.brand',
          'listing.vehicle.model',
          'listing.user',
        ],
        order: { created_at: 'DESC' },
      });
    });

    it('should return empty array when no favorites', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('checkIfFavorite', () => {
    it('should return true when favorite exists', async () => {
      repository.findOne.mockResolvedValue(mockFavorite);

      const result = await service.checkIfFavorite('user-1', 'listing-1');

      expect(result).toBe(true);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { user_id: 'user-1', listing_id: 'listing-1' },
      });
    });

    it('should return false when favorite does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.checkIfFavorite('user-1', 'listing-1');

      expect(result).toBe(false);
    });
  });

  describe('getUserFavoriteIds', () => {
    it('should return array of favorite listing IDs', async () => {
      const favorites = [
        { ...mockFavorite, listing_id: 'listing-1' },
        { ...mockFavorite, id: 'favorite-2', listing_id: 'listing-2' },
      ];
      repository.find.mockResolvedValue(favorites as Favorite[]);

      const result = await service.getUserFavoriteIds('user-1');

      expect(result).toEqual(['listing-1', 'listing-2']);
      expect(repository.find).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        select: ['listing_id'],
      });
    });

    it('should return empty array when no favorites', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.getUserFavoriteIds('user-1');

      expect(result).toEqual([]);
    });
  });
});
