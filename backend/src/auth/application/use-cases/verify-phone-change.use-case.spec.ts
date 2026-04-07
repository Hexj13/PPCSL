import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from '../../../users/application/users.service';
import { PhoneService } from '../../domain/services/phone.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { SmsService } from '../../infrastructure/services/sms.service';
import { ChangePhoneVerifyDto } from '../../presentation/dto/change-phone.dto';

import { VerifyPhoneChangeUseCase } from './verify-phone-change.use-case';

describe('VerifyPhoneChangeUseCase', () => {
  let useCase: VerifyPhoneChangeUseCase;
  let phoneService: jest.Mocked<Pick<PhoneService, 'normalize'>>;
  let usersService: jest.Mocked<Pick<UsersService, 'findByPhone' | 'update'>>;
  let smsService: jest.Mocked<Pick<SmsService, 'verifyCode'>>;
  let emailService: jest.Mocked<Pick<EmailService, 'sendPhoneChangedNotification'>>;

  const userId = 'user-uuid';
  const dto: ChangePhoneVerifyDto = {
    phone: '+37369111222',
    code: '1234',
  };

  beforeEach(async () => {
    phoneService = {
      normalize: jest.fn(),
    };
    usersService = {
      findByPhone: jest.fn(),
      update: jest.fn(),
    };
    smsService = {
      verifyCode: jest.fn(),
    };
    emailService = {
      sendPhoneChangedNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyPhoneChangeUseCase,
        { provide: PhoneService, useValue: phoneService },
        { provide: UsersService, useValue: usersService },
        { provide: SmsService, useValue: smsService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    useCase = module.get(VerifyPhoneChangeUseCase);
  });

  it('should send phone changed email when security alerts are enabled', async () => {
    phoneService.normalize.mockReturnValue('+37369111222');
    usersService.findByPhone.mockResolvedValue(null);
    smsService.verifyCode.mockResolvedValue(true);
    usersService.update.mockResolvedValue({
      id: userId,
      email: 'user@example.com',
      emailVerified: true,
      emailNotificationSecurityAlerts: true,
      preferredLocale: 'ru',
      password: 'hash',
    } as Awaited<ReturnType<UsersService['update']>>);

    await useCase.execute(userId, dto);

    expect(emailService.sendPhoneChangedNotification).toHaveBeenCalledWith(
      'user@example.com',
      'ru',
    );
  });

  it('should not send phone changed email when email is not verified', async () => {
    phoneService.normalize.mockReturnValue('+37369111222');
    usersService.findByPhone.mockResolvedValue(null);
    smsService.verifyCode.mockResolvedValue(true);
    usersService.update.mockResolvedValue({
      id: userId,
      email: 'user@example.com',
      emailVerified: false,
      emailNotificationSecurityAlerts: true,
      preferredLocale: 'ru',
      password: 'hash',
    } as Awaited<ReturnType<UsersService['update']>>);

    await useCase.execute(userId, dto);

    expect(emailService.sendPhoneChangedNotification).not.toHaveBeenCalled();
  });

  it('should not send phone changed email when security alerts are disabled', async () => {
    phoneService.normalize.mockReturnValue('+37369111222');
    usersService.findByPhone.mockResolvedValue(null);
    smsService.verifyCode.mockResolvedValue(true);
    usersService.update.mockResolvedValue({
      id: userId,
      email: 'user@example.com',
      emailVerified: true,
      emailNotificationSecurityAlerts: false,
      preferredLocale: 'ru',
      password: 'hash',
    } as Awaited<ReturnType<UsersService['update']>>);

    await useCase.execute(userId, dto);

    expect(emailService.sendPhoneChangedNotification).not.toHaveBeenCalled();
  });
});
