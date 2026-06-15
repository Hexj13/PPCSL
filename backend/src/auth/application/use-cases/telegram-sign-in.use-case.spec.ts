import { BadRequestException } from '@nestjs/common';

import { TelegramSignInUseCase } from './telegram-sign-in.use-case';
import type { TelegramAuthProfile } from '../../infrastructure/services/telegram-auth-verifier.service';
import { User } from '../../../users/entities/user.entity';

describe('TelegramSignInUseCase', () => {
  const usersService = {
    findByTelegramId: jest.fn(),
    findByTelegramIdAny: jest.fn(),
    releaseTelegramIdentity: jest.fn(),
    findByPhone: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findOneById: jest.fn(),
  };
  const verifier = { verify: jest.fn() };
  const nonceService = { consume: jest.fn() };
  const phoneService = {
    normalize: jest.fn((phone: string) => `+${phone.replace(/\D/g, '')}`),
    isValid: jest.fn(() => true),
    equals: jest.fn((a: string, b: string) => a === b),
  };
  const authTokenIssuer = {
    issueLoginResponse: jest.fn(),
  };

  let useCase: TelegramSignInUseCase;

  const baseProfile: TelegramAuthProfile = {
    id: '123456789',
    firstName: 'Test',
    lastName: 'User',
    username: 'test_user',
    phoneNumber: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new TelegramSignInUseCase(
      usersService as never,
      verifier as never,
      nonceService as never,
      phoneService as never,
      authTokenIssuer as never,
    );
  });

  it('creates a new user with verified phone when Telegram returns phone_number', async () => {
    const profile = { ...baseProfile, phoneNumber: '37370123456' };
    usersService.findByTelegramId.mockResolvedValue(null);
    usersService.findByTelegramIdAny.mockResolvedValue(null);
    usersService.findByPhone.mockResolvedValue(null);
    usersService.create.mockResolvedValue({
      id: 'user-1',
      phone: '+37370123456',
      phoneVerified: true,
      type: 'Individual',
      email: null,
    } as User);
    usersService.findOneById.mockResolvedValue({
      id: 'user-1',
      phone: '+37370123456',
      phoneVerified: true,
    } as User);
    authTokenIssuer.issueLoginResponse.mockResolvedValue({
      access_token: 'token',
      refresh_token: 'refresh',
      user: { id: 'user-1' },
    });

    const result = await useCase.signInWithProfile(profile, { termsAccepted: true });

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '+37370123456',
        phoneVerified: true,
        telegramId: '123456789',
      }),
    );
    expect(result.requiresPhoneVerification).toBe(false);
    expect(result.isNewUser).toBe(true);
  });

  it('falls back to phone_required when Telegram does not return phone_number', async () => {
    usersService.findByTelegramId.mockResolvedValue(null);
    usersService.findByTelegramIdAny.mockResolvedValue(null);
    usersService.create.mockResolvedValue({
      id: 'user-1',
      phone: null,
      phoneVerified: false,
      type: 'Individual',
      email: null,
    } as User);
    usersService.findOneById.mockResolvedValue({
      id: 'user-1',
      phone: null,
      phoneVerified: false,
    } as User);
    authTokenIssuer.issueLoginResponse.mockResolvedValue({
      access_token: 'token',
      refresh_token: 'refresh',
      user: { id: 'user-1' },
    });

    const result = await useCase.signInWithProfile(baseProfile, { termsAccepted: true });

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: null,
        phoneVerified: false,
      }),
    );
    expect(result.requiresPhoneVerification).toBe(true);
  });

  it('returns phone conflict when Telegram phone belongs to another user', async () => {
    const profile = { ...baseProfile, phoneNumber: '37370123456' };
    usersService.findByTelegramId.mockResolvedValue(null);
    usersService.findByTelegramIdAny.mockResolvedValue(null);
    usersService.findByPhone.mockResolvedValue({ id: 'other-user' } as User);

    await expect(useCase.signInWithProfile(profile, { termsAccepted: true })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('consumes nonce and verifies id_token on execute', async () => {
    verifier.verify.mockResolvedValue(baseProfile);
    nonceService.consume.mockResolvedValue(undefined);
    usersService.findByTelegramId.mockResolvedValue({
      id: 'user-1',
      phone: null,
      phoneVerified: false,
    } as User);
    usersService.findOneById.mockResolvedValue({
      id: 'user-1',
      phone: null,
      phoneVerified: false,
    } as User);
    authTokenIssuer.issueLoginResponse.mockResolvedValue({
      access_token: 'token',
      refresh_token: 'refresh',
      user: { id: 'user-1' },
    });

    await useCase.execute(
      { idToken: 'token', nonce: 'nonce-value', termsAccepted: true },
      '127.0.0.1',
      'ru',
    );

    expect(verifier.verify).toHaveBeenCalledWith('token', 'nonce-value');
    expect(nonceService.consume).toHaveBeenCalledWith('nonce-value');
  });
});
