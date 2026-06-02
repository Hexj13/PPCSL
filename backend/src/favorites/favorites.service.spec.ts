import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Listing } from '../listings/entities/listing.entity';

import { AddFavoriteUseCase } from './application/use-cases/add-favorite.use-case';
import { ListFavoritesUseCase } from './application/use-cases/list-favorites.use-case';
import { RemoveFavoriteUseCase } from './application/use-cases/remove-favorite.use-case';
import { Favorite } from './entities/favorite.entity';
import { FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let repository: jest.Mocked<Repository<Favorite>>;
  let module: TestingModule;
  let addFavoriteUseCase: { execute: jest.Mock };
  let removeFavoriteUseCase: { execute: jest.Mock };
  let listFavoritesUseCase: { execute: jest.Mock };

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
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    addFavoriteUseCase = { execute: jest.fn() };
    removeFavoriteUseCase = { execute: jest.fn() };
    listFavoritesUseCase = { execute: jest.fn() };

    module = await Test.createTestingModule({
      providers: [
        FavoritesService,
        {
          provide: getRepositoryToken(Favorite),
          useValue: mockRepository,
        },
        { provide: AddFavoriteUseCase, useValue: addFavoriteUseCase },
        { provide: RemoveFavoriteUseCase, useValue: removeFavoriteUseCase },
        { provide: ListFavoritesUseCase, useValue: listFavoritesUseCase },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
    repository = module.get(getRepositoryToken(Favorite));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('add', () => {
    it('should delegate to AddFavoriteUseCase', async () => {
      addFavoriteUseCase.execute.mockResolvedValue(mockFavorite);

      const result = await service.add('user-1', 'listing-1');

      expect(result).toEqual(mockFavorite);
      expect(addFavoriteUseCase.execute).toHaveBeenCalledWith('user-1', 'listing-1');
    });
  });

  describe('remove', () => {
    it('should delegate to RemoveFavoriteUseCase', async () => {
      removeFavoriteUseCase.execute.mockResolvedValue(undefined);

      await service.remove('user-1', 'listing-1');

      expect(removeFavoriteUseCase.execute).toHaveBeenCalledWith('user-1', 'listing-1');
    });

    it('should propagate NotFoundException from use case', async () => {
      removeFavoriteUseCase.execute.mockRejectedValue(
        new NotFoundException('errors.favoriteNotFound'),
      );

      await expect(service.remove('user-1', 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should delegate to ListFavoritesUseCase', async () => {
      const listing = {
        id: 'listing-1',
        approxPriceDefaultCurrency: 1000,
        defaultCurrencyCode: 'EUR',
      } as unknown as Listing;
      const payload = {
        data: [{ ...mockFavorite, listing } as Favorite],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      listFavoritesUseCase.execute.mockResolvedValue(payload);

      const result = await service.findAll('user-1', 1, 20);

      expect(result).toEqual(payload);
      expect(listFavoritesUseCase.execute).toHaveBeenCalledWith('user-1', 1, 20);
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

  describe('checkBatch', () => {
    it('should return favorite statuses for multiple listings', async () => {
      repository.find.mockResolvedValue([
        { listing_id: 'listing-1' },
        { listing_id: 'listing-2' },
      ] as Favorite[]);

      const result = await service.checkBatch('user-1', ['listing-1', 'listing-2', 'listing-3']);

      expect(result).toEqual({
        'listing-1': true,
        'listing-2': true,
        'listing-3': false,
      });
    });

    it('should return empty object when no listing IDs provided', async () => {
      const result = await service.checkBatch('user-1', []);

      expect(result).toEqual({});
      expect(repository.find).not.toHaveBeenCalled();
    });

    it('should return empty object when listingIds is null', async () => {
      const result = await service.checkBatch('user-1', null as any);

      expect(result).toEqual({});
    });

    it('should return all false when no favorites exist', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.checkBatch('user-1', ['listing-1', 'listing-2']);

      expect(result).toEqual({
        'listing-1': false,
        'listing-2': false,
      });
    });
  });
});
