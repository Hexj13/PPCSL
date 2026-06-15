import { NotFoundException } from '@nestjs/common';

import { DevTelegramSignInUseCase } from './dev-telegram-sign-in.use-case';
import { TelegramSignInUseCase } from './telegram-sign-in.use-case';

describe('DevTelegramSignInUseCase', () => {
  const telegramSignInUseCase = {
    signInWithProfile: jest.fn(),
  } as unknown as jest.Mocked<TelegramSignInUseCase>;

  let useCase: DevTelegramSignInUseCase;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'development';
    useCase = new DevTelegramSignInUseCase(telegramSignInUseCase);
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('rejects mock sign-in outside development', () => {
    process.env.NODE_ENV = 'production';
    expect(() => useCase.assertAllowed()).toThrow(NotFoundException);
  });

  it('delegates to telegram sign-in with a stable dev profile', async () => {
    telegramSignInUseCase.signInWithProfile.mockResolvedValue({
      access_token: 'token',
      refresh_token: 'refresh',
      user: {
        id: 'user-1',
        email: null,
        type: 'Individual',
        firstName: 'Dev',
        lastName: 'Telegram',
        companyName: null,
        companyWebsiteUrl: null,
        phone: null,
        boardSlug: null,
        preferredLocale: null,
        hidePartnerPromoBanner: false,
        isPlatformPartner: false,
        phoneVerified: false,
      },
      requiresPhoneVerification: true,
      isNewUser: true,
    });

    const result = await useCase.execute(
      { termsAccepted: true, type: 'Individual' },
      '127.0.0.1',
      'ru',
    );

    expect(telegramSignInUseCase.signInWithProfile).toHaveBeenCalledWith(
      {
        id: '900000001',
        firstName: 'Dev',
        lastName: 'Telegram',
        username: 'dev_telegram_user',
        phoneNumber: null,
      },
      { termsAccepted: true, type: 'Individual' },
      '127.0.0.1',
      'ru',
    );
    expect(result.isNewUser).toBe(true);
  });
});
