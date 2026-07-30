import { randomUUID } from 'crypto';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { isWeeklyViewsDigestEnabled } from '../../../common/env';
import { UserType } from '../../../common/types';
import { logUserEvent } from '../../../common/utils/log-user-event';
import { UsersService } from '../../../users/application/users.service';
import { cleanUserData } from '../../../users/domain/utils/data-cleanup.utils';
import { User } from '../../../users/entities/user.entity';
import { SmsService } from '../../infrastructure/services/sms.service';
import type { LoginResponse } from '../auth.types';
import { AuthTokenIssuerService } from '../services/auth-token-issuer.service';

@Injectable()
export class E2eCreateGoogleBusinessUserUseCase {
  private readonly logger = new Logger(E2eCreateGoogleBusinessUserUseCase.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly smsService: SmsService,
    private readonly authTokenIssuer: AuthTokenIssuerService,
  ) {}

  assertAllowed(): void {
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production' || nodeEnv === 'stage') {
      throw new NotFoundException();
    }
  }

  async execute(): Promise<LoginResponse> {
    this.assertAllowed();
    const suffix = Date.now().toString().slice(-8);
    const phone = this.smsService.normalizePhoneNumber(`+37379${suffix}`);
    const email = `e2e-google-${suffix}@example.com`;
    const companyName = `E2E Google Business ${suffix}`;
    const googleId = `e2e-google-${randomUUID()}`;

    const user = await this.usersService.create(
      cleanUserData({
        type: UserType.Business,
        email,
        companyName,
        phone,
        phoneVerified: true,
        emailVerified: true,
        googleId,
        authProvider: 'google',
        password: null,
        emailNotifications: true,
        emailNotificationListingRefreshReminders: true,
        emailNotificationWeeklyViewsDigest: isWeeklyViewsDigestEnabled(),
        emailNotificationSecurityAlerts: true,
      }) as Partial<User>,
    );

    logUserEvent(this.logger, {
      event: 'e2e_google_business_user_created',
      userId: user.id,
    });

    return this.authTokenIssuer.issueLoginResponse(user);
  }
}
