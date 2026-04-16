import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  UserProfilePatchService,
  type UserProfilePatchFields,
} from '../auth/application/user-profile-patch.service';
import { EmailService } from '../auth/infrastructure/services/email.service';
import { RefreshTokenService } from '../auth/infrastructure/services/refresh-token.service';
import { ListingStatus as ListingStatusEnum, UserType as UserTypeEnum } from '../common/types';
import { logUserEvent } from '../common/utils/log-user-event';
import { buildPaginationMeta } from '../common/utils/pagination.utils';
import { IListingCache, LISTING_CACHE } from '../listings/application/ports/listing-cache.port';
import { Listing } from '../listings/entities/listing.entity';
import { UsersService } from '../users/application/users.service';
import { cleanUserData } from '../users/domain/utils/data-cleanup.utils';
import { User } from '../users/entities/user.entity';

import type { AdminUpdateUserProfileDto } from './dto/admin-update-user-profile.dto';

type SanitizedUser = Omit<
  User,
  | 'password'
  | 'getDisplayName'
  | 'canCreateListing'
  | 'deactivate'
  | 'isAdmin'
  | 'setPlatformPartner'
  | 'setFreePromotionBalance'
  | 'registerPartnerListingCreation'
  | 'consumeFreePromotion'
>;

type AdminUpdateUserProfileResult = {
  user: SanitizedUser;
  emailConfirmationSent: boolean;
};

type AdminUserListItem = SanitizedUser & {
  listingCountTotal: number;
  listingCountActive: number;
};

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
    private refreshTokenService: RefreshTokenService,
    @Inject(LISTING_CACHE)
    private listingCache: IListingCache,
    private usersService: UsersService,
    private userProfilePatchService: UserProfilePatchService,
    private emailService: EmailService,
  ) {}

  async getAllUsers(
    page: number = 1,
    limit: number = 20,
    searchQuery?: string,
    userType?: string,
    activity?: string,
  ): Promise<{
    data: AdminUserListItem[];
    meta: {
      total: number;
      totalAll: number;
      activeTotal: number;
      inactiveTotal: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;
    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .orderBy('user.created_at', 'DESC');

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      queryBuilder.where(
        '(LOWER(CAST(user.id AS TEXT)) LIKE :search OR LOWER(user.email) LIKE :search OR LOWER(user.phone) LIKE :search OR LOWER(user.firstName) LIKE :search OR LOWER(user.lastName) LIKE :search OR LOWER(user.companyName) LIKE :search)',
        { search: `%${searchLower}%` },
      );
    }

    if (userType && userType !== 'All') {
      if (searchQuery) {
        queryBuilder.andWhere('user.type = :userType', { userType });
      } else {
        queryBuilder.where('user.type = :userType', { userType });
      }
    }

    const totalAll = await queryBuilder.getCount();
    const activeTotal = await queryBuilder
      .clone()
      .andWhere('user.active = :activeOnly', { activeOnly: true })
      .getCount();
    const inactiveTotal = await queryBuilder
      .clone()
      .andWhere('user.active = :inactiveOnly', { inactiveOnly: false })
      .getCount();

    const listQuery = queryBuilder.clone();
    if (activity === 'active') {
      listQuery.andWhere('user.active = :listActivity', { listActivity: true });
    } else if (activity === 'inactive') {
      listQuery.andWhere('user.active = :listActivity', { listActivity: false });
    }

    const [users, total] = await listQuery.skip(skip).take(limit).getManyAndCount();

    const userIds = users.map((user) => user.id);
    const listingCountsByUserId = new Map<string, { total: number; active: number }>();

    if (userIds.length > 0) {
      const listingCounts = await this.listingsRepository
        .createQueryBuilder('listing')
        .select('listing.user_id', 'user_id')
        .addSelect('COUNT(*)', 'total_count')
        .addSelect(
          'SUM(CASE WHEN listing.status = :activeStatus THEN 1 ELSE 0 END)',
          'active_count',
        )
        .where('listing.user_id IN (:...userIds)', {
          userIds,
          activeStatus: ListingStatusEnum.Active,
        })
        .groupBy('listing.user_id')
        .getRawMany<{ user_id: string; total_count: string; active_count: string }>();

      for (const row of listingCounts) {
        listingCountsByUserId.set(row.user_id, {
          total: Number(row.total_count) || 0,
          active: Number(row.active_count) || 0,
        });
      }
    }

    const processedUsers = users.map((user) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;
      const counts = listingCountsByUserId.get(user.id) ?? { total: 0, active: 0 };
      return {
        ...userWithoutPassword,
        listings: user.listings ?? [],
        listingCountTotal: counts.total,
        listingCountActive: counts.active,
      };
    });

    return {
      data: processedUsers,
      meta: {
        ...buildPaginationMeta(total, page, limit),
        total,
        totalAll,
        activeTotal,
        inactiveTotal,
      },
    };
  }

  async getUserListings(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: [
        'listings',
        'listings.vehicle',
        'listings.vehicle.brand',
        'listings.vehicle.model',
        'listings.tire',
        'listings.tire.brand',
        'listings.tire.model',
      ],
    });
    if (!user) {
      throw new NotFoundException('errors.userNotFound');
    }
    return user.listings || [];
  }

  async refreshUserActiveListingDates(
    targetUserId: string,
    actorUserId: string,
  ): Promise<{ updated: number }> {
    const user = await this.usersRepository.findOne({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('errors.userNotFound');
    }

    const activeRows = await this.listingsRepository.find({
      where: { user_id: targetUserId, status: ListingStatusEnum.Active },
      select: ['id'],
    });

    if (activeRows.length === 0) {
      return { updated: 0 };
    }

    const now = new Date();
    await this.listingsRepository.update(
      { user_id: targetUserId, status: ListingStatusEnum.Active },
      { last_updated_at: now, updated_at: now },
    );

    try {
      await this.listingCache.invalidateSearch();
      await Promise.all(activeRows.map((row) => this.listingCache.invalidateSingle(row.id)));
    } catch {
      // Ignore cache errors
    }

    logUserEvent(this.logger, {
      event: 'admin_user_active_listing_dates_refreshed',
      actorUserId,
      userId: targetUserId,
      updated: activeRows.length,
    });

    return { updated: activeRows.length };
  }

  async validateAssignUser(userId: string): Promise<{
    valid: boolean;
    user?: {
      id: string;
      displayName: string;
      type: string;
      activeListings: number;
      listingLimit: number;
    };
    error?: string;
  }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      return { valid: false, error: 'errors.userNotFound' };
    }

    if (!user.active) {
      return { valid: false, error: 'errors.assignedUserDeactivated' };
    }

    const activeListings = await this.listingsRepository.count({
      where: { user_id: userId, status: ListingStatusEnum.Active },
    });
    const listingLimit = await this.usersService.getListingLimit(userId);

    if (activeListings >= listingLimit) {
      return {
        valid: false,
        error: `errors.activeListingsLimitExceeded|${listingLimit}`,
      };
    }

    const displayName =
      user.getDisplayName()?.trim() || user.email?.trim() || user.phone?.trim() || user.id;

    return {
      valid: true,
      user: {
        id: user.id,
        displayName,
        type: user.type,
        activeListings,
        listingLimit,
      },
    };
  }

  async toggleUserStatus(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('errors.userNotFound');
    }

    const isDeletedUser =
      !user.firstName && !user.lastName && !user.companyName && !user.email && !user.phone;

    if (isDeletedUser && !user.active) {
      throw new BadRequestException('errors.cannotActivateDeletedUser');
    }

    const wasActive = user.active;
    user.active = !user.active;
    const savedUser = await this.usersRepository.save(user);

    if (wasActive && !savedUser.active) {
      await this.refreshTokenService.revokeAllUserTokens(userId);
    }

    return this.sanitizeUser(savedUser);
  }

  async updateUserPartnerSettings(
    userId: string,
    data: {
      isPlatformPartner: boolean;
      freePromotionBalance?: number;
    },
    actorUserId: string,
  ) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('errors.userNotFound');
    }

    if (user.type !== UserTypeEnum.Business) {
      if (data.isPlatformPartner) {
        throw new BadRequestException('errors.partnerSettingsBusinessOnly');
      }
      if (
        !user.isPlatformPartner &&
        user.freePromotionBalance === 0 &&
        user.partnerListingProgress === 0
      ) {
        return this.sanitizeUser(user);
      }
      user.setPlatformPartner(false);
      const cleared = await this.usersRepository.save(user);
      logUserEvent(this.logger, {
        event: 'admin_partner_settings_updated',
        actorUserId,
        userId: cleared.id,
        isPlatformPartner: cleared.isPlatformPartner,
        freePromotionBalance: cleared.freePromotionBalance,
        partnerListingProgress: cleared.partnerListingProgress,
      });
      return this.sanitizeUser(cleared);
    }

    user.setPlatformPartner(data.isPlatformPartner);
    if (data.isPlatformPartner && data.freePromotionBalance !== undefined) {
      user.setFreePromotionBalance(data.freePromotionBalance);
    }

    const savedUser = await this.usersRepository.save(user);

    logUserEvent(this.logger, {
      event: 'admin_partner_settings_updated',
      actorUserId,
      userId: savedUser.id,
      isPlatformPartner: savedUser.isPlatformPartner,
      freePromotionBalance: savedUser.freePromotionBalance,
      partnerListingProgress: savedUser.partnerListingProgress,
    });

    return this.sanitizeUser(savedUser);
  }

  async updateUserProfile(
    userId: string,
    dto: AdminUpdateUserProfileDto,
    actorUserId: string,
  ): Promise<AdminUpdateUserProfileResult> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('errors.userNotFound');
    }

    const cleaned = cleanUserData({ ...dto } as Record<string, unknown>) as Record<
      string,
      string | null | undefined
    >;
    const patchInput: UserProfilePatchFields = {};

    if (user.type === UserTypeEnum.Business) {
      if (dto.email !== undefined) {
        patchInput.email = cleaned.email as string | null | undefined;
      }
      if (dto.companyName !== undefined) {
        patchInput.companyName = cleaned.companyName as string | null | undefined;
      }
      if (dto.companyWebsiteUrl !== undefined) {
        patchInput.companyWebsiteUrl = cleaned.companyWebsiteUrl as string | null | undefined;
      }
      if (dto.additionalPhone !== undefined) {
        patchInput.additionalPhone = cleaned.additionalPhone as string | null | undefined;
      }
    } else {
      if (dto.email !== undefined) {
        patchInput.email = cleaned.email as string | null | undefined;
      }
      if (dto.firstName !== undefined) {
        patchInput.firstName = cleaned.firstName as string | null | undefined;
      }
      if (dto.lastName !== undefined) {
        patchInput.lastName = cleaned.lastName as string | null | undefined;
      }
    }

    const patch = await this.userProfilePatchService.buildPatch(user, userId, patchInput);
    const previousEmail = user.email;
    if (patch.email !== undefined && patch.email !== previousEmail) {
      patch.emailVerified = false;
    }
    if (patch.email === null) {
      patch.emailVerified = false;
    }
    const resolvedEmail = patch.email !== undefined ? patch.email : user.email;
    const hasEmail = resolvedEmail != null && String(resolvedEmail).trim() !== '';
    if (dto.emailVerified !== undefined && hasEmail) {
      patch.emailVerified = dto.emailVerified;
    }

    const changedFields = Object.keys(patch)
      .filter((k) => k !== 'password')
      .sort();
    if (changedFields.length === 0) {
      return {
        user: this.sanitizeUser(user),
        emailConfirmationSent: false,
      };
    }

    const savedUser = await this.usersService.update(userId, patch);
    const emailConfirmationSent = await this.sendAdminEmailChangeConfirmation(
      savedUser,
      patch,
      previousEmail,
    );
    logUserEvent(this.logger, {
      event: 'admin_user_profile_updated',
      actorUserId,
      userId: savedUser.id,
      changedFields,
    });
    return {
      user: this.sanitizeUser(savedUser),
      emailConfirmationSent,
    };
  }

  private sanitizeUser(user: User): SanitizedUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private async sendAdminEmailChangeConfirmation(
    savedUser: User,
    patch: Partial<User>,
    previousEmail: string | null,
  ): Promise<boolean> {
    const emailChanged =
      patch.email !== undefined && patch.email !== null && patch.email !== previousEmail;
    if (!emailChanged || patch.emailVerified === true || !savedUser.email) {
      return false;
    }

    try {
      await this.emailService.sendEmailChangeConfirmationEmail(
        savedUser.id,
        savedUser.email,
        savedUser.preferredLocale,
      );
      return true;
    } catch {
      return false;
    }
  }
}
