import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { UserType } from '../../../common/types';
import { UsersService } from '../../../users/application/users.service';
import { User } from '../../../users/entities/user.entity';
import { RefreshTokenService } from '../../infrastructure/services/refresh-token.service';
import { DeleteAccountUseCase } from './delete-account.use-case';

describe('DeleteAccountUseCase', () => {
  let useCase: DeleteAccountUseCase;
  let usersService: jest.Mocked<Pick<UsersService, 'findOneById' | 'update'>>;
  let refreshTokenService: jest.Mocked<Pick<RefreshTokenService, 'revokeAllUserTokens'>>;

  const activeUser = {
    id: 'user-1',
    email: 'user@example.com',
    phone: '+37370123456',
    additionalPhone: null,
    firstName: 'Test',
    lastName: 'User',
    companyName: null,
    companyWebsiteUrl: null,
    googleId: 'google-sub-1',
    active: true,
    type: UserType.Individual,
    deactivate: User.prototype.deactivate,
  } as User;

  beforeEach(async () => {
    usersService = {
      findOneById: jest.fn(),
      update: jest.fn(),
    };
    refreshTokenService = {
      revokeAllUserTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteAccountUseCase,
        { provide: UsersService, useValue: usersService },
        { provide: EventEmitter2, useValue: { emitAsync: jest.fn() } },
        { provide: RefreshTokenService, useValue: refreshTokenService },
      ],
    }).compile();

    useCase = module.get(DeleteAccountUseCase);
  });

  it('clears googleId when deleting an account', async () => {
    usersService.findOneById.mockResolvedValue(activeUser);
    usersService.update.mockResolvedValue(activeUser);

    await useCase.execute(activeUser.id);

    expect(usersService.update).toHaveBeenCalledWith(
      activeUser.id,
      expect.objectContaining({
        googleId: null,
        email: null,
        phone: null,
        active: false,
      }),
    );
  });

  it('throws userDeactivated when account is already inactive', async () => {
    usersService.findOneById.mockResolvedValue({ ...activeUser, active: false } as User);

    await expect(useCase.execute(activeUser.id)).rejects.toThrow(
      new BadRequestException('errors.userDeactivated'),
    );
  });
});
