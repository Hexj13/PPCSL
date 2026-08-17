import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import * as constants from '../../../common/constants';
import { isWeeklyViewsDigestEnabled } from '../../../common/env';
import { UserType } from '../../../common/types';
import { handleDuplicateKeyError } from '../../../common/utils/error-handling.utils';
import { logUserEvent } from '../../../common/utils/log-user-event';
import { UsersService } from '../../../users/application/users.service';
import { cleanUserData } from '../../../users/domain/utils/data-cleanup.utils';
import { isSelfDeletedUser } from '../../../users/domain/utils/user-account-status.utils';
import { User } from '../../../users/entities/user.entity';
import { FacebookTokenVerifierService } from '../../infrastructure/services/facebook-token-verifier.service';
import { FacebookSignInDto } from '../../presentation/dto/facebook-sign-in.dto';
import { FacebookSignInResponse } from '../auth.types';
import { AuthTokenIssuerService } from '../services/auth-token-issuer.service';

@Injectable()
export class FacebookSignInUseCase {
  private readonly logger = new Logger(FacebookSignInUseCase.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly verifier: FacebookTokenVerifierService,
    private readonly authTokenIssuer: AuthTokenIssuerService,
  ) {}

  async execute(
    dto: FacebookSignInDto,
    ip?: string,
    requestLocale?: string,
  ): Promise<FacebookSignInResponse> {
    const profile = await this.verifier.verify(dto.accessToken);

    let user = await this.usersService.findByFacebookId(profile.sub);
    let isNewUser = false;

    if (!user) {
      const inactiveByFacebook = await this.usersService.findByFacebookIdAny(profile.sub);
      if (inactiveByFacebook) {
        if (isSelfDeletedUser(inactiveByFacebook)) {
          await this.usersService.releaseFacebookIdentity(inactiveByFacebook.id);
        } else {
          throw new UnauthorizedException('errors.userDeactivated');
        }
      }
    }

    if (!user) {
      const byEmail = await this.usersService.findByEmail(profile.email);
      if (byEmail) {
        throw new BadRequestException('errors.facebookEmailAlreadyExists');
      } else {
        const inactiveByEmail = await this.usersService.findByEmailAny(profile.email);
        if (inactiveByEmail) {
          if (isSelfDeletedUser(inactiveByEmail)) {
            if (inactiveByEmail.facebookId) {
              await this.usersService.releaseFacebookIdentity(inactiveByEmail.id);
            }
          } else {
            throw new UnauthorizedException('errors.userDeactivated');
          }
        }
      }
    }

    if (!user) {
      if (!dto.termsAccepted) {
        throw new BadRequestException('errors.termsNotAccepted');
      }
      isNewUser = true;
      const normalizedRequestLocale = requestLocale?.trim().toLowerCase();
      const defaultType = constants.userTypes[0] as UserType;
      const newUserData = cleanUserData({
        type: (dto.type ?? defaultType) as UserType,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        facebookId: profile.sub,
        authProvider: 'facebook' as const,
        password: null,
        phone: null,
        phoneVerified: false,
        emailVerified: false,
        registration_ip: ip ?? null,
        emailNotifications: true,
        emailNotificationListingRefreshReminders: true,
        emailNotificationWeeklyViewsDigest: isWeeklyViewsDigestEnabled(),
        emailNotificationSecurityAlerts: true,
        ...(constants.isPreferredUiLocale(normalizedRequestLocale)
          ? { preferredLocale: normalizedRequestLocale }
          : {}),
      }) as Partial<User>;
      try {
        user = await this.usersService.create(newUserData);
      } catch (error) {
        handleDuplicateKeyError(error, {
          email: 'errors.emailAlreadyExists',
          facebook_id: 'errors.facebookSignInFailed',
          facebookId: 'errors.facebookSignInFailed',
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
}
