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
import { GoogleTokenVerifierService } from '../../infrastructure/services/google-token-verifier.service';
import { GoogleSignInDto } from '../../presentation/dto/google-sign-in.dto';
import { GoogleSignInResponse } from '../auth.types';
import { AuthTokenIssuerService } from '../services/auth-token-issuer.service';

@Injectable()
export class GoogleSignInUseCase {
  private readonly logger = new Logger(GoogleSignInUseCase.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly verifier: GoogleTokenVerifierService,
    private readonly authTokenIssuer: AuthTokenIssuerService,
  ) {}

  async execute(
    dto: GoogleSignInDto,
    ip?: string,
    requestLocale?: string,
  ): Promise<GoogleSignInResponse> {
    const profile = await this.verifier.verify(dto.idToken);

    let user = await this.usersService.findByGoogleId(profile.sub);
    let isNewUser = false;

    if (!user) {
      const inactiveByGoogle = await this.usersService.findByGoogleIdAny(profile.sub);
      if (inactiveByGoogle) {
        if (isSelfDeletedUser(inactiveByGoogle)) {
          await this.usersService.releaseGoogleIdentity(inactiveByGoogle.id);
        } else {
          throw new UnauthorizedException('errors.userDeactivated');
        }
      }
    }

    if (!user) {
      const byEmail = await this.usersService.findByEmail(profile.email);
      if (byEmail) {
        if (byEmail.googleId && byEmail.googleId !== profile.sub) {
          throw new BadRequestException('errors.googleSignInFailed');
        }
        const patch: Partial<User> = {
          googleId: profile.sub,
          emailVerified: true,
        };
        if (!byEmail.password) {
          patch.authProvider = 'google';
        }
        await this.usersService.update(byEmail.id, patch);
        user = await this.usersService.findOneById(byEmail.id);
      } else {
        const inactiveByEmail = await this.usersService.findByEmailAny(profile.email);
        if (inactiveByEmail) {
          if (isSelfDeletedUser(inactiveByEmail)) {
            if (inactiveByEmail.googleId) {
              await this.usersService.releaseGoogleIdentity(inactiveByEmail.id);
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
        googleId: profile.sub,
        authProvider: 'google' as const,
        password: null,
        phone: null,
        phoneVerified: false,
        emailVerified: true,
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
          google_id: 'errors.googleSignInFailed',
          googleId: 'errors.googleSignInFailed',
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
