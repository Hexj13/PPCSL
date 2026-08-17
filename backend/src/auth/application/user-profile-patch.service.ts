import { BadRequestException, Injectable } from '@nestjs/common';

import type { PreferredUiLocale } from '../../common/constants';
import { isWeeklyViewsDigestEnabled } from '../../common/env';
import { UsersService } from '../../users/application/users.service';
import { User } from '../../users/entities/user.entity';
import { SmsService } from '../infrastructure/services/sms.service';

export type UserProfilePatchFields = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  companyWebsiteUrl?: string | null;
  additionalPhone?: string | null;
  emailNotifications?: boolean;
  emailNotificationListingRefreshReminders?: boolean;
  emailNotificationWeeklyViewsDigest?: boolean;
  emailNotificationSecurityAlerts?: boolean;
  viber?: boolean;
  whatsapp?: boolean;
  telegram?: boolean;
  preferredLocale?: PreferredUiLocale | null;
  phone?: string | null;
  phoneVerified?: boolean;
  type?: 'Individual' | 'Business';
};

@Injectable()
export class UserProfilePatchService {
  constructor(
    private usersService: UsersService,
    private smsService: SmsService,
  ) {}

  async buildPatch(
    currentUser: User,
    targetUserId: string,
    input: UserProfilePatchFields,
  ): Promise<Partial<User>> {
    const cleanedData: Partial<User> = { ...input };

    if (cleanedData.email !== undefined) {
      if (cleanedData.email === '' || cleanedData.email === null) {
        cleanedData.email = null;
      } else if (typeof cleanedData.email === 'string') {
        const normalizedEmail = cleanedData.email.trim().toLowerCase();
        const normalizedCurrentEmail = currentUser.email?.trim().toLowerCase() ?? null;
        if (normalizedEmail === '') {
          cleanedData.email = null;
        } else if (normalizedEmail !== normalizedCurrentEmail) {
          const existingUser = await this.usersService.findByEmail(normalizedEmail);
          if (existingUser && existingUser.id !== targetUserId) {
            throw new BadRequestException('errors.emailAlreadyExists');
          }
          cleanedData.email = normalizedEmail;
        } else {
          delete cleanedData.email;
        }
      } else if (cleanedData.email !== currentUser.email) {
        const existingUser = await this.usersService.findByEmail(cleanedData.email);
        if (existingUser && existingUser.id !== targetUserId) {
          throw new BadRequestException('errors.emailAlreadyExists');
        }
      } else {
        delete cleanedData.email;
      }
    } else {
      delete cleanedData.email;
    }

    if (cleanedData.lastName === '' || cleanedData.lastName === null) {
      cleanedData.lastName = null;
    }

    if (cleanedData.firstName === '' || cleanedData.firstName === null) {
      cleanedData.firstName = null;
    }

    if (cleanedData.companyName === '' || cleanedData.companyName === null) {
      cleanedData.companyName = null;
    }

    if (
      cleanedData.companyWebsiteUrl === '' ||
      cleanedData.companyWebsiteUrl === null ||
      cleanedData.companyWebsiteUrl === undefined
    ) {
      cleanedData.companyWebsiteUrl = null;
    } else if (
      cleanedData.companyWebsiteUrl !== undefined &&
      cleanedData.companyWebsiteUrl.trim() === ''
    ) {
      cleanedData.companyWebsiteUrl = null;
    }

    if (cleanedData.additionalPhone !== undefined) {
      if (currentUser.type !== 'Business') {
        delete cleanedData.additionalPhone;
      } else {
        const raw = cleanedData.additionalPhone;
        if (raw === '' || raw === null) {
          cleanedData.additionalPhone = null;
        } else if (typeof raw === 'string' && raw.trim() === '') {
          cleanedData.additionalPhone = null;
        } else if (typeof raw === 'string') {
          const normalized = this.smsService.normalizePhoneNumber(raw.trim());
          const primaryNorm = currentUser.phone
            ? this.smsService.normalizePhoneNumber(currentUser.phone)
            : null;
          if (primaryNorm && normalized === primaryNorm) {
            throw new BadRequestException('errors.additionalPhoneSameAsPrimary');
          }
          cleanedData.additionalPhone = normalized;
        }
      }
    } else {
      delete cleanedData.additionalPhone;
    }

    if (cleanedData.emailNotifications === undefined) {
      delete cleanedData.emailNotifications;
    }
    if (cleanedData.emailNotificationListingRefreshReminders === undefined) {
      delete cleanedData.emailNotificationListingRefreshReminders;
    }
    if (!isWeeklyViewsDigestEnabled()) {
      cleanedData.emailNotificationWeeklyViewsDigest = false;
    } else if (cleanedData.emailNotificationWeeklyViewsDigest === undefined) {
      delete cleanedData.emailNotificationWeeklyViewsDigest;
    }
    if (cleanedData.emailNotificationSecurityAlerts === undefined) {
      delete cleanedData.emailNotificationSecurityAlerts;
    }
    if (cleanedData.viber === undefined) {
      delete cleanedData.viber;
    }
    if (cleanedData.whatsapp === undefined) {
      delete cleanedData.whatsapp;
    }
    if (cleanedData.telegram === undefined) {
      delete cleanedData.telegram;
    }
    if (cleanedData.preferredLocale === undefined) {
      delete cleanedData.preferredLocale;
    }
    if (cleanedData.phone !== undefined) {
      const raw = cleanedData.phone;
      if (raw === '' || raw === null) {
        delete cleanedData.phone;
      } else if (typeof raw === 'string') {
        const normalized = this.smsService.normalizePhoneNumber(raw.trim());
        const current = currentUser.phone?.trim()
          ? this.smsService.normalizePhoneNumber(currentUser.phone)
          : null;
        if (current) {
          if (normalized === current) {
            delete cleanedData.phone;
          } else if (currentUser.phoneVerified === true) {
            throw new BadRequestException('errors.primaryPhoneMustUseChangeFlow');
          } else {
            const existing = await this.usersService.findByPhone(normalized);
            if (existing && existing.id !== targetUserId) {
              throw new BadRequestException('errors.phoneAlreadyExists');
            }
            cleanedData.phone = normalized;
            cleanedData.phoneVerified = false;
          }
        } else {
          const existing = await this.usersService.findByPhone(normalized);
          if (existing && existing.id !== targetUserId) {
            throw new BadRequestException('errors.phoneAlreadyExists');
          }
          cleanedData.phone = normalized;
          cleanedData.phoneVerified = false;
        }
      }
    } else {
      delete cleanedData.phone;
    }

    if (cleanedData.type !== undefined) {
      if (currentUser.phoneVerified === true) {
        delete cleanedData.type;
      } else if (cleanedData.type === 'Individual' || cleanedData.type === 'Business') {
        if (cleanedData.type === currentUser.type) {
          delete cleanedData.type;
        }
      } else {
        delete cleanedData.type;
      }
    } else {
      delete cleanedData.type;
    }

    for (const key of Object.keys(cleanedData) as (keyof Partial<User>)[]) {
      if (cleanedData[key] === undefined) {
        delete cleanedData[key];
      }
    }

    return cleanedData;
  }
}
