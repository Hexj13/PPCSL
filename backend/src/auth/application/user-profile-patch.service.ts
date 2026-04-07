import { BadRequestException, Injectable } from '@nestjs/common';

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
  preferredLocale?: 'ro' | 'ru' | null;
  phone?: string | null;
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
    if (cleanedData.emailNotificationWeeklyViewsDigest === undefined) {
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
    if (cleanedData.phone === undefined) {
      delete cleanedData.phone;
    }

    for (const key of Object.keys(cleanedData) as (keyof Partial<User>)[]) {
      if (cleanedData[key] === undefined) {
        delete cleanedData[key];
      }
    }

    return cleanedData;
  }
}
