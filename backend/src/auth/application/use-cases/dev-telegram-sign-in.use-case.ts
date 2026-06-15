import { Injectable, NotFoundException } from '@nestjs/common';

import {
  DEV_TELEGRAM_USER_ID,
  isTelegramAuthMockAllowed,
} from '../../infrastructure/services/telegram-auth-mock.utils';
import { DevTelegramSignInDto } from '../../presentation/dto/dev-telegram-sign-in.dto';
import { TelegramSignInResponse } from '../auth.types';

import { TelegramSignInUseCase } from './telegram-sign-in.use-case';

@Injectable()
export class DevTelegramSignInUseCase {
  constructor(private readonly telegramSignInUseCase: TelegramSignInUseCase) {}

  assertAllowed(): void {
    if (!isTelegramAuthMockAllowed(process.env.NODE_ENV)) {
      throw new NotFoundException();
    }
  }

  async execute(
    dto: DevTelegramSignInDto,
    ip?: string,
    requestLocale?: string,
  ): Promise<TelegramSignInResponse> {
    this.assertAllowed();
    return this.telegramSignInUseCase.signInWithProfile(
      {
        id: DEV_TELEGRAM_USER_ID,
        firstName: 'Dev',
        lastName: 'Telegram',
        username: 'dev_telegram_user',
        phoneNumber: null,
      },
      dto,
      ip,
      requestLocale,
    );
  }
}
