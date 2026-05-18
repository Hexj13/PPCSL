import { BadRequestException, Injectable } from '@nestjs/common';

import { UsersService } from '../../../users/application/users.service';
import { SmsService } from '../../infrastructure/services/sms.service';
import { LoginResponse } from '../auth.types';
import { AuthTokenIssuerService } from '../services/auth-token-issuer.service';

@Injectable()
export class VerifyPhoneUseCase {
  constructor(
    private readonly usersService: UsersService,
    private readonly smsService: SmsService,
    private readonly authTokenIssuer: AuthTokenIssuerService,
  ) {}

  async execute(userId: string, code: string): Promise<LoginResponse> {
    const user = await this.usersService.findOneById(userId);
    if (!user.phone?.trim()) {
      throw new BadRequestException('errors.phoneRequiredField');
    }
    const ok = await this.smsService.verifyCode(user.phone, code);
    if (!ok) {
      throw new BadRequestException('errors.invalidCode');
    }
    await this.usersService.update(userId, { phoneVerified: true });
    const fresh = await this.usersService.findOneById(userId);
    return this.authTokenIssuer.issueLoginResponse(fresh);
  }
}
