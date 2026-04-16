import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ListingsService } from '../listings/listings.service';
import { UsersService } from '../users/application/users.service';

import { BoardController } from './board.controller';

describe('BoardController', () => {
  let controller: BoardController;
  let usersService: jest.Mocked<UsersService>;
  let listingsService: jest.Mocked<ListingsService>;

  beforeEach(async () => {
    const mockUsersService = {
      findByBoardSlug: jest.fn(),
      getSellerDisplayName: jest.fn(),
    };

    const mockListingsService = {
      getBoardListings: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoardController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: ListingsService, useValue: mockListingsService },
      ],
    }).compile();

    controller = module.get<BoardController>(BoardController);
    usersService = module.get(UsersService);
    listingsService = module.get(ListingsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getBySlug', () => {
    it('should return board info for valid slug', async () => {
      const mockUser = {
        id: 'user-1',
        board_slug: 'dealer-one',
        type: 'Individual',
        isPlatformPartner: false,
      } as any;

      usersService.findByBoardSlug.mockResolvedValue(mockUser);
      usersService.getSellerDisplayName.mockReturnValue('Dealer One');

      const result = await controller.getBySlug('dealer-one');

      expect(usersService.findByBoardSlug).toHaveBeenCalledWith('dealer-one');
      expect(result).toEqual({
        userId: 'user-1',
        displayName: 'Dealer One',
        boardSlug: 'dealer-one',
        isPlatformPartner: false,
      });
    });

    it('should set isPlatformPartner true for Business partner', async () => {
      const mockUser = {
        id: 'user-2',
        board_slug: 'biz-dealer',
        type: 'Business',
        isPlatformPartner: true,
      } as any;

      usersService.findByBoardSlug.mockResolvedValue(mockUser);
      usersService.getSellerDisplayName.mockReturnValue('Biz Dealer');

      const result = await controller.getBySlug('biz-dealer');

      expect(result.isPlatformPartner).toBe(true);
    });

    it('should throw NotFoundException when user not found', async () => {
      usersService.findByBoardSlug.mockResolvedValue(null);

      await expect(controller.getBySlug('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getListings', () => {
    it('should return listings with default pagination', async () => {
      const mockResult = { data: [], total: 0 };
      listingsService.getBoardListings.mockResolvedValue(mockResult as any);

      const result = await controller.getListings('dealer-one');

      expect(listingsService.getBoardListings).toHaveBeenCalledWith('dealer-one', {
        page: 1,
        limit: 20,
        sortBy: 'created_at',
        sortOrder: 'DESC',
      });
      expect(result).toBe(mockResult);
    });

    it('should pass parsed pagination parameters', async () => {
      const mockResult = { data: [], total: 0 };
      listingsService.getBoardListings.mockResolvedValue(mockResult as any);

      await controller.getListings('dealer-one', '2', '10', 'price', 'ASC');

      expect(listingsService.getBoardListings).toHaveBeenCalledWith('dealer-one', {
        page: 2,
        limit: 10,
        sortBy: 'price',
        sortOrder: 'ASC',
      });
    });

    it('should default sortOrder to DESC for invalid value', async () => {
      const mockResult = { data: [], total: 0 };
      listingsService.getBoardListings.mockResolvedValue(mockResult as any);

      await controller.getListings('dealer-one', undefined, undefined, undefined, 'INVALID');

      expect(listingsService.getBoardListings).toHaveBeenCalledWith('dealer-one', {
        page: 1,
        limit: 20,
        sortBy: 'created_at',
        sortOrder: 'DESC',
      });
    });
  });
});
