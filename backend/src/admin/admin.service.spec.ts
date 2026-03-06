import { Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../common/types';
import { Listing } from '../listings/entities/listing.entity';
import { PromotionHistory } from '../listings/entities/promotion-history.entity';
import { ListingsService } from '../listings/listings.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/application/users.service';

import { AdminService } from './admin.service';
import { IListingCache, LISTING_CACHE } from '../listings/application/ports/listing-cache.port';
import { RefreshTokenService } from '../auth/infrastructure/services/refresh-token.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';

function createUser(overrides: Partial<User> = {}): User {
  const user = new User();
  Object.assign(user, {
    id: 'user-1',
    type: 'Individual',
    email: 'user@example.com',
    password: 'hash',
    phone: null,
    firstName: 'John',
    lastName: 'Doe',
    companyName: null,
    active: true,
    ...overrides,
  });
  return user;
}

describe('AdminService', () => {
  describe('validateAssignUser', () => {
    it('should return valid and user when user exists, is active, and under limit', async () => {
      const user = createUser({ id: 'target-id', firstName: 'Jane', type: 'Individual' });
      const usersRepository = {
        findOne: jest.fn().mockResolvedValue(user),
      } as unknown as Repository<User>;
      const listingsRepository = {
        count: jest.fn().mockResolvedValue(2),
      } as unknown as Repository<Listing>;
      const usersService = {
        getListingLimit: jest.fn().mockResolvedValue(100),
      } as unknown as UsersService;

      const service = new AdminService(
        usersRepository,
        listingsRepository,
        {} as Repository<PromotionHistory>,
        {} as RefreshTokenService,
        {} as ListingsService,
        {} as ExchangeRatesService,
        {} as IListingCache,
        usersService,
      );

      const result = await service.validateAssignUser('target-id');

      expect(result).toEqual({
        valid: true,
        user: {
          id: 'target-id',
          displayName: 'Jane',
          type: 'Individual',
          activeListings: 2,
          listingLimit: 100,
        },
      });
      expect(usersRepository.findOne).toHaveBeenCalledWith({ where: { id: 'target-id' } });
      expect(listingsRepository.count).toHaveBeenCalledWith({
        where: { user_id: 'target-id', status: ListingStatusEnum.Active },
      });
      expect(usersService.getListingLimit).toHaveBeenCalledWith('target-id');
    });

    it('should return valid with companyName as displayName for Business user', async () => {
      const user = createUser({
        id: 'biz-id',
        type: 'Business',
        companyName: 'Acme Inc.',
        firstName: 'John',
      });
      const usersRepository = {
        findOne: jest.fn().mockResolvedValue(user),
      } as unknown as Repository<User>;
      const listingsRepository = {
        count: jest.fn().mockResolvedValue(0),
      } as unknown as Repository<Listing>;
      const usersService = {
        getListingLimit: jest.fn().mockResolvedValue(50),
      } as unknown as UsersService;

      const service = new AdminService(
        usersRepository,
        listingsRepository,
        {} as Repository<PromotionHistory>,
        {} as RefreshTokenService,
        {} as ListingsService,
        {} as ExchangeRatesService,
        {} as IListingCache,
        usersService,
      );

      const result = await service.validateAssignUser('biz-id');

      expect(result.valid).toBe(true);
      expect(result.user?.displayName).toBe('Acme Inc.');
    });

    it('should return valid with fallback to email when getDisplayName is empty', async () => {
      const user = createUser({
        id: 'minimal-id',
        firstName: null,
        lastName: null,
        companyName: null,
        email: 'minimal@example.com',
        phone: null,
      });
      const usersRepository = {
        findOne: jest.fn().mockResolvedValue(user),
      } as unknown as Repository<User>;
      const listingsRepository = {
        count: jest.fn().mockResolvedValue(0),
      } as unknown as Repository<Listing>;
      const usersService = {
        getListingLimit: jest.fn().mockResolvedValue(10),
      } as unknown as UsersService;

      const service = new AdminService(
        usersRepository,
        listingsRepository,
        {} as Repository<PromotionHistory>,
        {} as RefreshTokenService,
        {} as ListingsService,
        {} as ExchangeRatesService,
        {} as IListingCache,
        usersService,
      );

      const result = await service.validateAssignUser('minimal-id');

      expect(result.valid).toBe(true);
      expect(result.user?.displayName).toBe('minimal@example.com');
    });

    it('should return valid with fallback to id when no name, email, or phone', async () => {
      const user = createUser({
        id: 'id-only-user',
        firstName: null,
        lastName: null,
        companyName: null,
        email: null,
        phone: null,
      });
      const usersRepository = {
        findOne: jest.fn().mockResolvedValue(user),
      } as unknown as Repository<User>;
      const listingsRepository = {
        count: jest.fn().mockResolvedValue(0),
      } as unknown as Repository<Listing>;
      const usersService = {
        getListingLimit: jest.fn().mockResolvedValue(10),
      } as unknown as UsersService;

      const service = new AdminService(
        usersRepository,
        listingsRepository,
        {} as Repository<PromotionHistory>,
        {} as RefreshTokenService,
        {} as ListingsService,
        {} as ExchangeRatesService,
        {} as IListingCache,
        usersService,
      );

      const result = await service.validateAssignUser('id-only-user');

      expect(result.valid).toBe(true);
      expect(result.user?.displayName).toBe('id-only-user');
    });

    it('should return invalid when user is not found', async () => {
      const usersRepository = {
        findOne: jest.fn().mockResolvedValue(null),
      } as unknown as Repository<User>;
      const listingsRepository = { count: jest.fn() } as unknown as Repository<Listing>;
      const usersService = { getListingLimit: jest.fn() } as unknown as UsersService;

      const service = new AdminService(
        usersRepository,
        listingsRepository,
        {} as Repository<PromotionHistory>,
        {} as RefreshTokenService,
        {} as ListingsService,
        {} as ExchangeRatesService,
        {} as IListingCache,
        usersService,
      );

      const result = await service.validateAssignUser('non-existent');

      expect(result).toEqual({ valid: false, error: 'errors.userNotFound' });
      expect(listingsRepository.count).not.toHaveBeenCalled();
      expect(usersService.getListingLimit).not.toHaveBeenCalled();
    });

    it('should return invalid when user is deactivated', async () => {
      const user = createUser({ id: 'deactivated-id', active: false });
      const usersRepository = {
        findOne: jest.fn().mockResolvedValue(user),
      } as unknown as Repository<User>;
      const listingsRepository = { count: jest.fn() } as unknown as Repository<Listing>;
      const usersService = { getListingLimit: jest.fn() } as unknown as UsersService;

      const service = new AdminService(
        usersRepository,
        listingsRepository,
        {} as Repository<PromotionHistory>,
        {} as RefreshTokenService,
        {} as ListingsService,
        {} as ExchangeRatesService,
        {} as IListingCache,
        usersService,
      );

      const result = await service.validateAssignUser('deactivated-id');

      expect(result).toEqual({ valid: false, error: 'errors.assignedUserDeactivated' });
      expect(listingsRepository.count).not.toHaveBeenCalled();
    });

    it('should return invalid when user is at listing limit', async () => {
      const user = createUser({ id: 'at-limit-id' });
      const usersRepository = {
        findOne: jest.fn().mockResolvedValue(user),
      } as unknown as Repository<User>;
      const listingsRepository = {
        count: jest.fn().mockResolvedValue(10),
      } as unknown as Repository<Listing>;
      const usersService = {
        getListingLimit: jest.fn().mockResolvedValue(10),
      } as unknown as UsersService;

      const service = new AdminService(
        usersRepository,
        listingsRepository,
        {} as Repository<PromotionHistory>,
        {} as RefreshTokenService,
        {} as ListingsService,
        {} as ExchangeRatesService,
        {} as IListingCache,
        usersService,
      );

      const result = await service.validateAssignUser('at-limit-id');

      expect(result).toEqual({ valid: false, error: 'errors.activeListingsLimitExceeded' });
    });
  });
});
