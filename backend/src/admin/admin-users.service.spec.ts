import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { UserProfilePatchService } from '../auth/application/user-profile-patch.service';
import { EmailService } from '../auth/infrastructure/services/email.service';
import { RefreshTokenService } from '../auth/infrastructure/services/refresh-token.service';
import { ListingStatus as ListingStatusEnum } from '../common/types';
import { IListingCache } from '../listings/application/ports/listing-cache.port';
import { Listing } from '../listings/entities/listing.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/application/users.service';

import { AdminUsersService } from './admin-users.service';

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

describe('AdminUsersService', () => {
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

      const service = new AdminUsersService(
        usersRepository,
        listingsRepository,
        {} as RefreshTokenService,
        {} as IListingCache,
        usersService,
        {} as UserProfilePatchService,
        {} as EmailService,
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

      const service = new AdminUsersService(
        usersRepository,
        listingsRepository,
        {} as RefreshTokenService,
        {} as IListingCache,
        usersService,
        {} as UserProfilePatchService,
        {} as EmailService,
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

      const service = new AdminUsersService(
        usersRepository,
        listingsRepository,
        {} as RefreshTokenService,
        {} as IListingCache,
        usersService,
        {} as UserProfilePatchService,
        {} as EmailService,
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

      const service = new AdminUsersService(
        usersRepository,
        listingsRepository,
        {} as RefreshTokenService,
        {} as IListingCache,
        usersService,
        {} as UserProfilePatchService,
        {} as EmailService,
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

      const service = new AdminUsersService(
        usersRepository,
        listingsRepository,
        {} as RefreshTokenService,
        {} as IListingCache,
        usersService,
        {} as UserProfilePatchService,
        {} as EmailService,
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

      const service = new AdminUsersService(
        usersRepository,
        listingsRepository,
        {} as RefreshTokenService,
        {} as IListingCache,
        usersService,
        {} as UserProfilePatchService,
        {} as EmailService,
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

      const service = new AdminUsersService(
        usersRepository,
        listingsRepository,
        {} as RefreshTokenService,
        {} as IListingCache,
        usersService,
        {} as UserProfilePatchService,
        {} as EmailService,
      );

      const result = await service.validateAssignUser('at-limit-id');

      expect(result).toEqual({ valid: false, error: 'errors.activeListingsLimitExceeded|10' });
    });
  });

  describe('updateUserProfile', () => {
    it('skips persistence when buildPatch yields no changes', async () => {
      const user = createUser({ id: 'target' });
      const usersRepository = {
        findOne: jest.fn().mockResolvedValue(user),
      } as unknown as Repository<User>;
      const userProfilePatchService = {
        buildPatch: jest.fn().mockResolvedValue({}),
      } as unknown as UserProfilePatchService;
      const usersService = {
        update: jest.fn(),
      } as unknown as UsersService;
      const emailService = {
        sendEmailChangeConfirmationEmail: jest.fn(),
      } as unknown as EmailService;

      const service = new AdminUsersService(
        usersRepository,
        {} as Repository<Listing>,
        {} as RefreshTokenService,
        {} as IListingCache,
        usersService,
        userProfilePatchService,
        emailService,
      );

      const result = await service.updateUserProfile('target', {}, 'actor-1');

      expect(result).toEqual({
        user: expect.objectContaining({ id: 'target' }),
        emailConfirmationSent: false,
      });
      expect(usersService.update).not.toHaveBeenCalled();
      expect(emailService.sendEmailChangeConfirmationEmail).not.toHaveBeenCalled();
    });

    it('sends confirmation email when admin changes email without confirming it', async () => {
      const user = createUser({ id: 'target', email: 'old@example.com', emailVerified: true });
      const usersRepository = {
        findOne: jest.fn().mockResolvedValue(user),
      } as unknown as Repository<User>;
      const userProfilePatchService = {
        buildPatch: jest.fn().mockResolvedValue({ email: 'new@example.com' }),
      } as unknown as UserProfilePatchService;
      const updated = createUser({
        id: 'target',
        email: 'new@example.com',
        emailVerified: false,
        password: 'hash',
      });
      const usersService = {
        update: jest.fn().mockResolvedValue(updated),
      } as unknown as UsersService;
      const emailService = {
        sendEmailChangeConfirmationEmail: jest.fn().mockResolvedValue(undefined),
      } as unknown as EmailService;

      const service = new AdminUsersService(
        usersRepository,
        {} as Repository<Listing>,
        {} as RefreshTokenService,
        {} as IListingCache,
        usersService,
        userProfilePatchService,
        emailService,
      );

      const result = await service.updateUserProfile(
        'target',
        { email: 'new@example.com', emailVerified: false },
        'actor-1',
      );

      expect(usersService.update).toHaveBeenCalledWith('target', {
        email: 'new@example.com',
        emailVerified: false,
      });
      expect(emailService.sendEmailChangeConfirmationEmail).toHaveBeenCalledWith(
        'target',
        'new@example.com',
        updated.preferredLocale,
      );
      expect(result.emailConfirmationSent).toBe(true);
      expect(result.user.emailVerified).toBe(false);
    });

    it('does not send confirmation email when admin marks new email as verified', async () => {
      const user = createUser({ id: 'target', email: 'old@example.com', emailVerified: false });
      const usersRepository = {
        findOne: jest.fn().mockResolvedValue(user),
      } as unknown as Repository<User>;
      const userProfilePatchService = {
        buildPatch: jest.fn().mockResolvedValue({ email: 'new@example.com' }),
      } as unknown as UserProfilePatchService;
      const updated = createUser({
        id: 'target',
        email: 'new@example.com',
        emailVerified: true,
        password: 'hash',
      });
      const usersService = {
        update: jest.fn().mockResolvedValue(updated),
      } as unknown as UsersService;
      const emailService = {
        sendEmailChangeConfirmationEmail: jest.fn(),
      } as unknown as EmailService;

      const service = new AdminUsersService(
        usersRepository,
        {} as Repository<Listing>,
        {} as RefreshTokenService,
        {} as IListingCache,
        usersService,
        userProfilePatchService,
        emailService,
      );

      const result = await service.updateUserProfile(
        'target',
        { email: 'new@example.com', emailVerified: true },
        'actor-1',
      );

      expect(usersService.update).toHaveBeenCalledWith('target', {
        email: 'new@example.com',
        emailVerified: true,
      });
      expect(emailService.sendEmailChangeConfirmationEmail).not.toHaveBeenCalled();
      expect(result.emailConfirmationSent).toBe(false);
      expect(result.user.emailVerified).toBe(true);
    });

    it('applies emailVerified from dto when email unchanged', async () => {
      const user = createUser({ id: 'target', email: 'a@example.com', emailVerified: false });
      const usersRepository = {
        findOne: jest.fn().mockResolvedValue(user),
      } as unknown as Repository<User>;
      const userProfilePatchService = {
        buildPatch: jest.fn().mockResolvedValue({}),
      } as unknown as UserProfilePatchService;
      const updated = createUser({
        id: 'target',
        email: 'a@example.com',
        emailVerified: true,
        password: 'hash',
      });
      const usersService = {
        update: jest.fn().mockResolvedValue(updated),
      } as unknown as UsersService;
      const emailService = {
        sendEmailChangeConfirmationEmail: jest.fn(),
      } as unknown as EmailService;

      const service = new AdminUsersService(
        usersRepository,
        {} as Repository<Listing>,
        {} as RefreshTokenService,
        {} as IListingCache,
        usersService,
        userProfilePatchService,
        emailService,
      );

      const result = await service.updateUserProfile('target', { emailVerified: true }, 'actor-1');

      expect(usersService.update).toHaveBeenCalledWith('target', { emailVerified: true });
      expect(emailService.sendEmailChangeConfirmationEmail).not.toHaveBeenCalled();
      expect(result.emailConfirmationSent).toBe(false);
    });
  });

  describe('refreshUserActiveListingDates', () => {
    it('throws NotFoundException when user does not exist', async () => {
      const usersRepository = {
        findOne: jest.fn().mockResolvedValue(null),
      } as unknown as Repository<User>;
      const listingsRepository = {
        find: jest.fn(),
        update: jest.fn(),
      } as unknown as Repository<Listing>;

      const service = new AdminUsersService(
        usersRepository,
        listingsRepository,
        {} as RefreshTokenService,
        {
          invalidateSearch: jest.fn(),
          invalidateSingle: jest.fn(),
          invalidateSimilar: jest.fn(),
        } as unknown as IListingCache,
        {} as UsersService,
        {} as UserProfilePatchService,
        {} as EmailService,
      );

      await expect(service.refreshUserActiveListingDates('missing', 'actor')).rejects.toThrow(
        NotFoundException,
      );
      expect(listingsRepository.find).not.toHaveBeenCalled();
    });

    it('returns updated 0 when user has no active listings', async () => {
      const usersRepository = {
        findOne: jest.fn().mockResolvedValue(createUser({ id: 'u1' })),
      } as unknown as Repository<User>;
      const listingsRepository = {
        find: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      } as unknown as Repository<Listing>;
      const listingCache = {
        invalidateSearch: jest.fn(),
        invalidateSingle: jest.fn(),
        invalidateSimilar: jest.fn(),
      } as unknown as IListingCache;

      const service = new AdminUsersService(
        usersRepository,
        listingsRepository,
        {} as RefreshTokenService,
        listingCache,
        {} as UsersService,
        {} as UserProfilePatchService,
        {} as EmailService,
      );

      const result = await service.refreshUserActiveListingDates('u1', 'actor');

      expect(result).toEqual({ updated: 0 });
      expect(listingsRepository.update).not.toHaveBeenCalled();
      expect(listingCache.invalidateSearch).not.toHaveBeenCalled();
    });

    it('updates active listings and invalidates cache', async () => {
      const usersRepository = {
        findOne: jest.fn().mockResolvedValue(createUser({ id: 'u1' })),
      } as unknown as Repository<User>;
      const listingsRepository = {
        find: jest.fn().mockResolvedValue([{ id: 'l1' }, { id: 'l2' }]),
        update: jest.fn().mockResolvedValue({ affected: 2 }),
      } as unknown as Repository<Listing>;
      const listingCache = {
        invalidateSearch: jest.fn().mockResolvedValue(undefined),
        invalidateSingle: jest.fn().mockResolvedValue(undefined),
        invalidateSimilar: jest.fn().mockResolvedValue(undefined),
      } as unknown as IListingCache;

      const service = new AdminUsersService(
        usersRepository,
        listingsRepository,
        {} as RefreshTokenService,
        listingCache,
        {} as UsersService,
        {} as UserProfilePatchService,
        {} as EmailService,
      );

      const result = await service.refreshUserActiveListingDates('u1', 'actor');

      expect(result).toEqual({ updated: 2 });
      expect(listingsRepository.update).toHaveBeenCalled();
      expect(listingCache.invalidateSearch).toHaveBeenCalled();
      expect(listingCache.invalidateSingle).toHaveBeenCalledWith('l1');
      expect(listingCache.invalidateSingle).toHaveBeenCalledWith('l2');
    });
  });
});
