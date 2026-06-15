import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import * as constants from '../../../common/constants';
import { UserType } from '../../../common/types';
import { handleDuplicateKeyError } from '../../../common/utils/error-handling.utils';
import { logUserEvent } from '../../../common/utils/log-user-event';
import { UsersService } from '../../../users/application/users.service';
import { cleanUserData } from '../../../users/domain/utils/data-cleanup.utils';
import { isSelfDeletedUser } from '../../../users/domain/utils/user-account-status.utils';
import { User } from '../../../users/entities/user.entity';
import { PhoneService } from '../../domain/services/phone.service';
import { TelegramAuthVerifierService } from '../../infrastructure/services/telegram-auth-verifier.service';
import type { TelegramAuthProfile } from '../../infrastructure/services/telegram-auth-verifier.service';
import { TelegramOidcNonceService } from '../../infrastructure/services/telegram-oidc-nonce.service';
import { TelegramSignInDto } from '../../presentation/dto/telegram-sign-in.dto';
import { TelegramSignInResponse } from '../auth.types';
import { AuthTokenIssuerService } from '../services/auth-token-issuer.service';

@Injectable()
export class TelegramSignInUseCase {
  private readonly logger = new Logger(TelegramSignInUseCase.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly verifier: TelegramAuthVerifierService,
    private readonly nonceService: TelegramOidcNonceService,
    private readonly phoneService: PhoneService,
    private readonly authTokenIssuer: AuthTokenIssuerService,
  ) {}

  async execute(
    dto: TelegramSignInDto,
    ip?: string,
    requestLocale?: string,
  ): Promise<TelegramSignInResponse> {
    const profile = await this.verifier.verify(dto.idToken, dto.nonce);
    await this.nonceService.consume(dto.nonce);
    return this.signInWithProfile(profile, dto, ip, requestLocale);
  }

  async signInWithProfile(
    profile: TelegramAuthProfile,
    dto: Pick<TelegramSignInDto, 'termsAccepted' | 'type'>,
    ip?: string,
    requestLocale?: string,
  ): Promise<TelegramSignInResponse> {
    let user = await this.usersService.findByTelegramId(profile.id);
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
      const verifiedPhone = await this.resolveVerifiedPhoneForNewUser(profile);
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
        emailNotificationWeeklyViewsDigest: true,
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
        event: 'user_registered',
        userId: user.id,
        userType: user.type,
        hasEmail: !!user.email,
        hasPhone: !!user.phone,
      });
    } else {
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
  ): Promise<{ phone: string; phoneVerified: true } | null> {
    const verifiedPhone = this.normalizeVerifiedTelegramPhone(profile.phoneNumber);
    if (!verifiedPhone) {
      return null;
    }
    await this.assertPhoneAvailable(verifiedPhone.phone);
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
