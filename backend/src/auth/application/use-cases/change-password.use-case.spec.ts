import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from '../../../users/application/users.service';
import { PasswordService } from '../../domain/services/password.service';
import { ChangePasswordDto } from '../../presentation/dto/change-password.dto';

import { ChangePasswordUseCase } from './change-password.use-case';

describe('ChangePasswordUseCase', () => {
  let useCase: ChangePasswordUseCase;
  let usersService: jest.Mocked<Pick<UsersService, 'findOneById' | 'update'>>;
  let passwordService: jest.Mocked<Pick<PasswordService, 'verify' | 'hash'>>;

  const userId = 'user-uuid';
  const dto: ChangePasswordDto = {
    currentPassword: 'OldPass123!',
    newPassword: 'NewPass456!',
  };

  beforeEach(async () => {
    usersService = {
      findOneById: jest.fn(),
      update: jest.fn(),
    };
    passwordService = {
      verify: jest.fn(),
      hash: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangePasswordUseCase,
        { provide: UsersService, useValue: usersService },
        { provide: PasswordService, useValue: passwordService },
      ],
    }).compile();

    useCase = module.get(ChangePasswordUseCase);
  });

  it('should update password when current password is valid', async () => {
    usersService.findOneById.mockResolvedValue({
      id: userId,
      password: 'stored-hash',
    } as Awaited<ReturnType<UsersService['findOneById']>>);
    passwordService.verify.mockResolvedValue(true);
    passwordService.hash.mockResolvedValue('new-hash');

    await useCase.execute(userId, dto);

    expect(usersService.findOneById).toHaveBeenCalledWith(userId);
    expect(passwordService.verify).toHaveBeenCalledWith('OldPass123!', 'stored-hash');
    expect(passwordService.hash).toHaveBeenCalledWith('NewPass456!');
    expect(usersService.update).toHaveBeenCalledWith(userId, { password: 'new-hash' });
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
