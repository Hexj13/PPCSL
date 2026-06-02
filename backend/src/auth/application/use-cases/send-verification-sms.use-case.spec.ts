import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { User } from '../../../users/entities/user.entity';
import { UsersService } from '../../../users/application/users.service';
import { PhoneService } from '../../domain/services/phone.service';
import { AuthPhoneRateLimitService } from '../../infrastructure/services/auth-phone-rate-limit.service';
import { SmsService } from '../../infrastructure/services/sms.service';

import { SendVerificationSmsUseCase } from './send-verification-sms.use-case';

describe('SendVerificationSmsUseCase', () => {
  let useCase: SendVerificationSmsUseCase;
  let usersService: jest.Mocked<Pick<UsersService, 'findByPhone'>>;
  let smsService: jest.Mocked<Pick<SmsService, 'sendVerificationCode'>>;

  beforeEach(async () => {
    usersService = { findByPhone: jest.fn() };
    smsService = { sendVerificationCode: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendVerificationSmsUseCase,
        PhoneService,
        { provide: UsersService, useValue: usersService },
        { provide: SmsService, useValue: smsService },
        {
          provide: AuthPhoneRateLimitService,
          useValue: { assertWithinLimit: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    useCase = module.get(SendVerificationSmsUseCase);
  });

  it('should send SMS when phone is not registered', async () => {
    usersService.findByPhone.mockResolvedValue(null);

    const result = await useCase.execute('+37370123456');

    expect(result).toEqual({ success: true });
    expect(smsService.sendVerificationCode).toHaveBeenCalledWith('+37370123456');
  });

  it('should throw when phone belongs to another user', async () => {
    usersService.findByPhone.mockResolvedValue({ id: 'other-user' } as User);

    await expect(useCase.execute('+37370123456', 'requester-id')).rejects.toThrow(
      BadRequestException,
    );
    expect(smsService.sendVerificationCode).not.toHaveBeenCalled();
  });

  it('should send SMS when phone belongs to the requesting user', async () => {
    usersService.findByPhone.mockResolvedValue({ id: 'same-user' } as User);

    const result = await useCase.execute('+37370123456', 'same-user');

    expect(result).toEqual({ success: true });
    expect(smsService.sendVerificationCode).toHaveBeenCalledWith('+37370123456');
  });

  it('should throw when phone is taken and requester is anonymous', async () => {
    usersService.findByPhone.mockResolvedValue({ id: 'existing' } as User);

    await expect(useCase.execute('+37370123456')).rejects.toThrow(BadRequestException);
    expect(smsService.sendVerificationCode).not.toHaveBeenCalled();
  });
});
