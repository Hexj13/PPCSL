import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from '../../../users/application/users.service';
import { PasswordService } from '../../domain/services/password.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { RefreshTokenService } from '../../infrastructure/services/refresh-token.service';
import { ChangePasswordDto } from '../../presentation/dto/change-password.dto';

import { ChangePasswordUseCase } from './change-password.use-case';

describe('ChangePasswordUseCase', () => {
  let useCase: ChangePasswordUseCase;
  let usersService: jest.Mocked<
    Pick<UsersService, 'findOneById' | 'findOneByIdWithPassword' | 'update'>
  >;
  let passwordService: jest.Mocked<Pick<PasswordService, 'verify' | 'hash'>>;
  let emailService: jest.Mocked<Pick<EmailService, 'sendPasswordChangedNotification'>>;
  let refreshTokenService: jest.Mocked<Pick<RefreshTokenService, 'revokeAllUserTokensExcept'>>;

  const userId = 'user-uuid';
  const dto: ChangePasswordDto = {
    currentPassword: 'OldPass123!',
    newPassword: 'NewPass456!',
  };

  beforeEach(async () => {
    const findOneByIdMock = jest.fn();
    usersService = {
      findOneById: findOneByIdMock,
      findOneByIdWithPassword: jest
        .fn()
        .mockImplementation((...args: unknown[]) => findOneByIdMock(...args)),
      update: jest.fn(),
    };
    passwordService = {
      verify: jest.fn(),
      hash: jest.fn(),
    };
    emailService = {
      sendPasswordChangedNotification: jest.fn(),
    };
    refreshTokenService = {
      revokeAllUserTokensExcept: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangePasswordUseCase,
        { provide: UsersService, useValue: usersService },
        { provide: PasswordService, useValue: passwordService },
        { provide: EmailService, useValue: emailService },
        { provide: RefreshTokenService, useValue: refreshTokenService },
      ],
    }).compile();

    useCase = module.get(ChangePasswordUseCase);
  });

  it('should update password when current password is valid', async () => {
    usersService.findOneById.mockResolvedValue({
      id: userId,
      email: 'user@example.com',
      emailVerified: true,
      emailNotificationSecurityAlerts: true,
      password: 'stored-hash',
    } as Awaited<ReturnType<UsersService['findOneById']>>);
    passwordService.verify.mockResolvedValue(true);
    passwordService.hash.mockResolvedValue('new-hash');

    await useCase.execute(userId, dto);

    expect(usersService.findOneById).toHaveBeenCalledWith(userId);
    expect(passwordService.verify).toHaveBeenCalledWith('OldPass123!', 'stored-hash');
    expect(passwordService.hash).toHaveBeenCalledWith('NewPass456!');
    expect(usersService.update).toHaveBeenCalledWith(userId, { password: 'new-hash' });
    expect(refreshTokenService.revokeAllUserTokensExcept).toHaveBeenCalledWith(userId, undefined);
    expect(emailService.sendPasswordChangedNotification).toHaveBeenCalledWith(
      'user@example.com',
      undefined,
    );
  });

  it('should revoke other sessions but keep the current refresh token', async () => {
    usersService.findOneById.mockResolvedValue({
      id: userId,
      password: 'stored-hash',
    } as Awaited<ReturnType<UsersService['findOneById']>>);
    passwordService.verify.mockResolvedValue(true);
    passwordService.hash.mockResolvedValue('new-hash');

    await useCase.execute(userId, dto, undefined, 'current-refresh-token');

    expect(refreshTokenService.revokeAllUserTokensExcept).toHaveBeenCalledWith(
      userId,
      'current-refresh-token',
    );
  });

  it('should use request locale for password changed email when profile locale is missing', async () => {
    usersService.findOneById.mockResolvedValue({
      id: userId,
      email: 'user@example.com',
      emailVerified: true,
      emailNotificationSecurityAlerts: true,
      password: 'stored-hash',
    } as Awaited<ReturnType<UsersService['findOneById']>>);
    passwordService.verify.mockResolvedValue(true);
    passwordService.hash.mockResolvedValue('new-hash');

    await useCase.execute(userId, dto, 'ro');

    expect(emailService.sendPasswordChangedNotification).toHaveBeenCalledWith(
      'user@example.com',
      'ro',
    );
  });

  it('should prefer request locale over profile locale for password changed email', async () => {
    usersService.findOneById.mockResolvedValue({
      id: userId,
      email: 'user@example.com',
      emailVerified: true,
      emailNotificationSecurityAlerts: true,
      preferredLocale: 'ru',
      password: 'stored-hash',
    } as Awaited<ReturnType<UsersService['findOneById']>>);
    passwordService.verify.mockResolvedValue(true);
    passwordService.hash.mockResolvedValue('new-hash');

    await useCase.execute(userId, dto, 'ro');

    expect(emailService.sendPasswordChangedNotification).toHaveBeenCalledWith(
      'user@example.com',
      'ro',
    );
  });

  it('should not send password changed email when security alerts are disabled', async () => {
    usersService.findOneById.mockResolvedValue({
      id: userId,
      email: 'user@example.com',
      emailNotificationSecurityAlerts: false,
      password: 'stored-hash',
    } as Awaited<ReturnType<UsersService['findOneById']>>);
    passwordService.verify.mockResolvedValue(true);
    passwordService.hash.mockResolvedValue('new-hash');

    await useCase.execute(userId, dto);

    expect(usersService.update).toHaveBeenCalledWith(userId, { password: 'new-hash' });
    expect(emailService.sendPasswordChangedNotification).not.toHaveBeenCalled();
  });

  it('should not send password changed email when email is not verified', async () => {
    usersService.findOneById.mockResolvedValue({
      id: userId,
      email: 'user@example.com',
      emailVerified: false,
      emailNotificationSecurityAlerts: true,
      password: 'stored-hash',
    } as Awaited<ReturnType<UsersService['findOneById']>>);
    passwordService.verify.mockResolvedValue(true);
    passwordService.hash.mockResolvedValue('new-hash');

    await useCase.execute(userId, dto);

    expect(usersService.update).toHaveBeenCalledWith(userId, { password: 'new-hash' });
    expect(emailService.sendPasswordChangedNotification).not.toHaveBeenCalled();
  });

  it('should throw when current password is invalid', async () => {
    usersService.findOneById.mockResolvedValue({
      id: userId,
      password: 'stored-hash',
    } as Awaited<ReturnType<UsersService['findOneById']>>);
    passwordService.verify.mockResolvedValue(false);

    await expect(useCase.execute(userId, dto)).rejects.toThrow('errors.invalidCurrentPassword');
    expect(usersService.update).not.toHaveBeenCalled();
  });

  it('should set password when account has no password yet', async () => {
    usersService.findOneById.mockResolvedValue({
      id: userId,
      email: 'user@example.com',
      emailVerified: true,
      emailNotificationSecurityAlerts: true,
      password: null,
    } as Awaited<ReturnType<UsersService['findOneById']>>);
    passwordService.hash.mockResolvedValue('new-hash');

    await useCase.execute(userId, { newPassword: 'NewPass456!' });

    expect(passwordService.verify).not.toHaveBeenCalled();
    expect(passwordService.hash).toHaveBeenCalledWith('NewPass456!');
    expect(usersService.update).toHaveBeenCalledWith(userId, { password: 'new-hash' });
  });

  it('should throw when new password equals current password', async () => {
    const sameDto: ChangePasswordDto = {
      currentPassword: 'SamePass123!',
      newPassword: 'SamePass123!',
    };
    usersService.findOneById.mockResolvedValue({
      id: userId,
      password: 'hash',
    } as Awaited<ReturnType<UsersService['findOneById']>>);
    passwordService.verify.mockResolvedValue(true);

    await expect(useCase.execute(userId, sameDto)).rejects.toThrow('errors.newPasswordMustDiffer');
    expect(passwordService.hash).not.toHaveBeenCalled();
    expect(usersService.update).not.toHaveBeenCalled();
  });
});
