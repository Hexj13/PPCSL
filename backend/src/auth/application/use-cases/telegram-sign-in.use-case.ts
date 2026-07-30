import { createHash } from 'crypto';

import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import * as constants from '../../../common/constants';
import { isWeeklyViewsDigestEnabled } from '../../../common/env';
import { UserType } from '../../../common/types';
import { handleDuplicateKeyError } from '../../../common/utils/error-handling.utils';
import { logUserActionFailure, logUserEvent } from '../../../common/utils/log-user-event';
import { UsersService } from '../../../users/application/users.service';
import { cleanUserData } from '../../../users/domain/utils/data-cleanup.utils';
import { isSelfDeletedUser } from '../../../users/domain/utils/user-account-status.utils';
import { User } from '../../../users/entities/user.entity';
import { PhoneService } from '../../domain/services/phone.service';
import { TelegramAuthVerifierService } from '../../infrastructure/services/telegram-auth-verifier.service';
import type { TelegramAuthProfile } from '../../infrastructure/services/telegram-auth-verifier.service';
import { TelegramSignInDto } from '../../presentation/dto/telegram-sign-in.dto';
import { TelegramSignInResponse } from '../auth.types';
import { AuthTokenIssuerService } from '../services/auth-token-issuer.service';

function hashTelegramId(telegramId: string): string {
  return createHash('sha256').update(telegramId).digest('hex').slice(0, 16);
}

function getErrorKey(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { message?: string } }).response;
    if (typeof response?.message === 'string') {
      return response.message;
    }
  }
  if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
    const response = error.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    if (response && typeof response === 'object' && 'message' in response) {
      const message = (response as { message?: string | string[] }).message;
      if (typeof message === 'string') {
        return message;
      }
      if (Array.isArray(message) && message.length > 0) {
        return message.join(', ');
      }
    }
  }
  return undefined;
}

@Injectable()
export class TelegramSignInUseCase {
  private readonly logger = new Logger(TelegramSignInUseCase.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly verifier: TelegramAuthVerifierService,
    private readonly phoneService: PhoneService,
    private readonly authTokenIssuer: AuthTokenIssuerService,
  ) {}

  async execute(
    dto: TelegramSignInDto,
    ip?: string,
    requestLocale?: string,
    requestId?: string,
  ): Promise<TelegramSignInResponse> {
    logUserEvent(this.logger, {
      event: 'telegram_signin_started',
      requestId,
      hasPreferredType: Boolean(dto.type),
      termsAccepted: Boolean(dto.termsAccepted),
    });

    try {
      const profile = this.verifier.verify(
        {
          id: dto.id,
          first_name: dto.first_name,
          last_name: dto.last_name,
          username: dto.username,
          photo_url: dto.photo_url,
          auth_date: dto.auth_date,
          hash: dto.hash,
        },
        requestId,
      );
      logUserEvent(this.logger, {
        event: 'telegram_token_verified',
        requestId,
        telegramIdHash: hashTelegramId(profile.id),
        hasPhoneClaim: Boolean(profile.phoneNumber),
        hasUsername: Boolean(profile.username),
      });

      return await this.signInWithProfile(profile, dto, ip, requestLocale, requestId);
    } catch (error) {
      logUserActionFailure(this.logger, {
        event: 'telegram_signin_failed',
        requestId,
        errorKey: getErrorKey(error),
        status:
          error instanceof BadRequestException
            ? 400
            : error instanceof UnauthorizedException
              ? 401
              : undefined,
      });
      throw error;
    }
  }

  async signInWithProfile(
    profile: TelegramAuthProfile,
    dto: Pick<TelegramSignInDto, 'termsAccepted' | 'type'>,
    ip?: string,
    requestLocale?: string,
    requestId?: string,
  ): Promise<TelegramSignInResponse> {
    let user = await this.usersService.findByTelegramId(profile.id);
    logUserEvent(this.logger, {
      event: 'telegram_user_lookup',
      requestId,
      telegramIdHash: hashTelegramId(profile.id),
      isExistingUser: Boolean(user),
    });
    let isNewUser = false;

    if (!user) {
      const inactiveByTelegram = await this.usersService.findByTelegramIdAny(profile.id);
      if (inactiveByTelegram) {
        if (isSelfDeletedUser(inactiveByTelegram)) {
          await this.usersService.releaseTelegramIdentity(inactiveByTelegram.id);
        } else {
          throw new UnauthorizedException('errors.userDeactivated');
        }
      }
    }

    if (!user) {
      if (!dto.termsAccepted) {
        throw new BadRequestException('errors.termsNotAccepted');
      }
      isNewUser = true;
      logUserEvent(this.logger, {
        event: 'telegram_new_user_create_started',
        requestId,
        telegramIdHash: hashTelegramId(profile.id),
        hasPhoneClaim: Boolean(profile.phoneNumber),
        hasUsername: Boolean(profile.username),
      });
      const verifiedPhone = await this.resolveVerifiedPhoneForNewUser(profile, requestId);
      const normalizedRequestLocale = requestLocale?.trim().toLowerCase();
      const defaultType = constants.userTypes[0] as UserType;
      const newUserData = cleanUserData({
        type: (dto.type ?? defaultType) as UserType,
        email: null,
        firstName: profile.firstName,
        lastName: profile.lastName,
        telegramId: profile.id,
        telegramUsername: profile.username,
        authProvider: 'telegram' as const,
        password: null,
        phone: verifiedPhone?.phone ?? null,
        phoneVerified: verifiedPhone?.phoneVerified ?? false,
        emailVerified: false,
        telegram: true,
        registration_ip: ip ?? null,
        emailNotifications: true,
        emailNotificationListingRefreshReminders: true,
        emailNotificationWeeklyViewsDigest: isWeeklyViewsDigestEnabled(),
        emailNotificationSecurityAlerts: true,
        ...(normalizedRequestLocale === 'ro' || normalizedRequestLocale === 'ru'
          ? { preferredLocale: normalizedRequestLocale }
          : {}),
      }) as Partial<User>;
      try {
        user = await this.usersService.create(newUserData);
      } catch (error) {
        handleDuplicateKeyError(error, {
          telegram_id: 'errors.telegramSignInFailed',
          telegramId: 'errors.telegramSignInFailed',
          phone: 'errors.phoneAlreadyExists',
        });
        throw error;
      }
      logUserEvent(this.logger, {
        event: 'telegram_new_user_created',
        requestId,
        userId: user.id,
        telegramIdHash: hashTelegramId(profile.id),
        hasPhoneClaim: Boolean(profile.phoneNumber),
      });
      logUserEvent(this.logger, {
        event: 'user_registered',
        userId: user.id,
        userType: user.type,
        hasEmail: !!user.email,
        hasPhone: !!user.phone,
      });
    } else {
      logUserEvent(this.logger, {
        event: 'telegram_existing_user_login',
        requestId,
        userId: user.id,
        telegramIdHash: hashTelegramId(profile.id),
      });
      const patch: Partial<User> = {};
      if (profile.username && profile.username !== user.telegramUsername) {
        patch.telegramUsername = profile.username;
      }
      if (profile.firstName && !user.firstName) {
        patch.firstName = profile.firstName;
      }
      if (profile.lastName && !user.lastName) {
        patch.lastName = profile.lastName;
      }
      const phonePatch = await this.resolveVerifiedPhoneForExistingUser(profile, user);
      Object.assign(patch, phonePatch);
      if (Object.keys(patch).length > 0) {
        await this.usersService.update(user.id, patch);
      }
    }

    await this.usersService.update(user.id, {
      last_login_at: new Date(),
      ...(ip ? { last_login_ip: ip } : {}),
    });
    const fresh = await this.usersService.findOneById(user.id);
    const login = await this.authTokenIssuer.issueLoginResponse(fresh);

    logUserEvent(this.logger, {
      event: 'telegram_login_cookies_issued',
      requestId,
      userId: user.id,
      isNewUser,
      requiresPhoneVerification: !(fresh.phone && fresh.phoneVerified),
    });

    logUserEvent(this.logger, {
      event: 'user_logged_in',
      userId: user.id,
    });

    return {
      ...login,
      requiresPhoneVerification: !(fresh.phone && fresh.phoneVerified),
      isNewUser,
    };
  }

  private normalizeVerifiedTelegramPhone(
    phoneNumber: string | null,
  ): { phone: string; phoneVerified: true } | null {
    if (!phoneNumber) {
      return null;
    }
    const normalized = this.phoneService.normalize(phoneNumber);
    if (!this.phoneService.isValid(normalized)) {
      return null;
    }
    return { phone: normalized, phoneVerified: true };
  }

  private async assertPhoneAvailable(phone: string, userId?: string): Promise<void> {
    const owner = await this.usersService.findByPhone(phone);
    if (owner && owner.id !== userId) {
      throw new BadRequestException('errors.phoneAlreadyExists');
    }
  }

  private async resolveVerifiedPhoneForNewUser(
    profile: TelegramAuthProfile,
    requestId?: string,
  ): Promise<{ phone: string; phoneVerified: true } | null> {
    const verifiedPhone = this.normalizeVerifiedTelegramPhone(profile.phoneNumber);
    if (!verifiedPhone) {
      return null;
    }
    try {
      await this.assertPhoneAvailable(verifiedPhone.phone);
    } catch (error) {
      if (error instanceof BadRequestException) {
        logUserActionFailure(this.logger, {
          event: 'telegram_phone_conflict',
          requestId,
          telegramIdHash: hashTelegramId(profile.id),
          errorKey: getErrorKey(error),
        });
      }
      throw error;
    }
    return verifiedPhone;
  }

  private async resolveVerifiedPhoneForExistingUser(
    profile: TelegramAuthProfile,
    user: User,
  ): Promise<Partial<Pick<User, 'phone' | 'phoneVerified'>>> {
    const verifiedPhone = this.normalizeVerifiedTelegramPhone(profile.phoneNumber);
    if (!verifiedPhone) {
      return {};
    }
    if (user.phone && !this.phoneService.equals(user.phone, verifiedPhone.phone)) {
      return {};
    }
    if (user.phone && user.phoneVerified) {
      return {};
    }
    await this.assertPhoneAvailable(verifiedPhone.phone, user.id);
    return verifiedPhone;
  }
}
