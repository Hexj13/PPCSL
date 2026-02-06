import { Test, TestingModule } from '@nestjs/testing';

import { Favorite } from './entities/favorite.entity';
import { CheckBatchDto } from './dto/check-batch.dto';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';

describe('FavoritesController', () => {
  let controller: FavoritesController;
  let service: jest.Mocked<FavoritesService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    phone: '+37370123456',
    firstName: 'Test',
    lastName: 'User',
    password: 'hashed-password',
    type: 'Individual' as const,
    companyName: null,
    companyWebsiteUrl: null,
    board_slug: null,
    active: true,
    emailNotifications: false,
    viber: false,
    whatsapp: false,
    telegram: false,
    phoneVerified: false,
    emailVerified: false,
    registration_ip: null,
    last_login_ip: null,
    last_listing_refresh_at: null,
    created_at: new Date(),
    listings: [],
    favorites: [],
  };
  const mockListing = {
    id: 'listing-1',
    title: 'Test Car',
    price: 10000,
    currency: 'EUR' as const,
    city: 'Skopje',
    status: 'Active' as const,
    description: 'Test description',
    user_id: 'user-1',
    user: mockUser,
    vehicle_id: null,
    vehicle: null,
    images: [],
    urgent: false,
    is_new: false,
    vin: null,
    condition: 'Undamaged' as const,
    registration_type: 'Local' as const,
    horsepower: 100,
    power_kw: null,
    is_registered: true,
    registration_expires_at: null,
    equipment: null,
    last_updated_at: new Date(),
    last_edited_at: null,
    last_published_at: new Date(),
    closed_at: null,
    views: 0,
    is_promoted: false,
    promoted_until: null,
    promoted_started_at: null,
    promoted_paused_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };
  const mockFavorite = {
    id: 'favorite-1',
    user_id: 'user-1',
    listing_id: 'listing-1',
    user: mockUser,
    listing: mockListing,
    created_at: new Date(),
  };

  beforeEach(async () => {
    const mockFavoritesService = {
      findAll: jest.fn(),
      checkBatch: jest.fn(),
      checkIfFavorite: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoritesController],
      providers: [
        {
          provide: FavoritesService,
          useValue: mockFavoritesService,
        },
      ],
    }).compile();

    controller = module.get<FavoritesController>(FavoritesController);
    service = module.get(FavoritesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all favorites for user', async () => {
      const req = { user: mockUser };
      const mockFavorites = [mockFavorite] as unknown as Favorite[];

      service.findAll.mockResolvedValue(mockFavorites);

      const result = await controller.findAll(req);

      expect(service.findAll).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockFavorites);
    });
  });

  describe('checkBatch', () => {
    it('should check multiple listings favorite status', async () => {
      const req = { user: mockUser };
      const dto: CheckBatchDto = { listingIds: ['listing-1', 'listing-2'] };
      const mockResult = {
        'listing-1': true,
        'listing-2': false,
      };

      service.checkBatch.mockResolvedValue(mockResult);

      const result = await controller.checkBatch(dto, req);

      expect(service.checkBatch).toHaveBeenCalledWith('user-1', dto.listingIds);
      expect(result).toEqual(mockResult);
    });
  });

  describe('check', () => {
    it('should check if listing is favorite', async () => {
      const req = { user: mockUser };
      const listingId = 'listing-1';

      service.checkIfFavorite.mockResolvedValue(true);

      const result = await controller.check(listingId, req);

      expect(service.checkIfFavorite).toHaveBeenCalledWith('user-1', listingId);
      expect(result).toEqual({ isFavorite: true });
    });

    it('should return false when listing is not favorite', async () => {
      const req = { user: mockUser };
      const listingId = 'listing-1';

      service.checkIfFavorite.mockResolvedValue(false);

      const result = await controller.check(listingId, req);

      expect(service.checkIfFavorite).toHaveBeenCalledWith('user-1', listingId);
      expect(result).toEqual({ isFavorite: false });
    });
  });

  describe('add', () => {
    it('should add listing to favorites', async () => {
      const req = { user: mockUser };
      const listingId = 'listing-1';
      const mockFavorite = {
        id: 'favorite-1',
        user_id: 'user-1',
        listing_id: listingId,
        user: mockUser,
        listing: mockListing,
        created_at: new Date(),
      };

      service.add.mockResolvedValue(mockFavorite as unknown as Favorite);

      const result = await controller.add(listingId, req);

      expect(service.add).toHaveBeenCalledWith('user-1', listingId);
      expect(result).toEqual(mockFavorite);
    });
  });

  describe('remove', () => {
    it('should remove listing from favorites', async () => {
      const req = { user: mockUser };
      const listingId = 'listing-1';

      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(listingId, req);

      expect(service.remove).toHaveBeenCalledWith('user-1', listingId);
      expect(result).toBeUndefined();
    });
  });
});
