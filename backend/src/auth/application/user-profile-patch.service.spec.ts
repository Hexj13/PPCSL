import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UserType } from '../../common/types';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/application/users.service';
import { SmsService } from '../infrastructure/services/sms.service';

import { UserProfilePatchService } from './user-profile-patch.service';

describe('UserProfilePatchService', () => {
  let service: UserProfilePatchService;
  let usersService: jest.Mocked<Pick<UsersService, 'findByEmail' | 'findByPhone'>>;
  let smsService: jest.Mocked<Pick<SmsService, 'normalizePhoneNumber'>>;

  const baseUser = (): User =>
    Object.assign(new User(), {
      id: 'u1',
      type: UserType.Individual,
      email: 'a@example.com',
      password: 'x',
      phone: '+37360000001',
      firstName: 'John',
      lastName: 'Doe',
      companyName: null,
      companyWebsiteUrl: null,
      additionalPhone: null,
      preferredLocale: null,
      active: true,
    });

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
    };
    smsService = {
      normalizePhoneNumber: jest.fn((p: string) => p.replace(/\s/g, '')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfilePatchService,
        { provide: UsersService, useValue: usersService },
        { provide: SmsService, useValue: smsService },
      ],
    }).compile();

    service = module.get(UserProfilePatchService);
  });

  it('throws when email belongs to another active user', async () => {
    usersService.findByEmail.mockResolvedValue({ id: 'other' } as User);
    await expect(
      service.buildPatch(baseUser(), 'u1', { email: 'taken@example.com' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows email change when same user holds the email', async () => {
    usersService.findByEmail.mockResolvedValue(baseUser());
    const patch = await service.buildPatch(baseUser(), 'u1', { email: 'a@example.com' });
    expect(patch.email).toBeUndefined();
  });

  it('resets additionalPhone to null for business when empty string', async () => {
    const u = baseUser();
    u.type = UserType.Business;
    const patch = await service.buildPatch(u, u.id, { additionalPhone: '' });
    expect(patch.additionalPhone).toBeNull();
  });

  it('includes preferredLocale when set', async () => {
    const patch = await service.buildPatch(baseUser(), 'u1', { preferredLocale: 'ru' });
    expect(patch.preferredLocale).toBe('ru');
  });

  it('sets primary phone when user has none', async () => {
    const u = baseUser();
    u.phone = null as unknown as string;
    usersService.findByPhone.mockResolvedValue(null);
    const patch = await service.buildPatch(u, u.id, { phone: '+37360111222' });
    expect(patch.phone).toBe('+37360111222');
    expect(patch.phoneVerified).toBe(false);
  });

  it('drops primary phone from patch when unchanged', async () => {
    const u = baseUser();
    const patch = await service.buildPatch(u, u.id, { phone: '+37360000001' });
    expect(patch.phone).toBeUndefined();
  });

  it('throws when changing verified primary phone via profile patch', async () => {
    const u = baseUser();
    u.phoneVerified = true;
    await expect(service.buildPatch(u, u.id, { phone: '+37360999999' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('allows changing primary phone when not yet verified', async () => {
    const u = baseUser();
    u.phoneVerified = false;
    usersService.findByPhone.mockResolvedValue(null);
    const patch = await service.buildPatch(u, u.id, { phone: '+37360999999' });
    expect(patch.phone).toBe('+37360999999');
    expect(patch.phoneVerified).toBe(false);
  });

  it('throws when new unverified primary phone is already taken', async () => {
    const u = baseUser();
    u.phoneVerified = false;
    usersService.findByPhone.mockResolvedValue({ id: 'other' } as User);
    await expect(service.buildPatch(u, u.id, { phone: '+37360999999' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when new primary phone is already taken', async () => {
    const u = baseUser();
    u.phone = null as unknown as string;
    usersService.findByPhone.mockResolvedValue({ id: 'other' } as User);
    await expect(service.buildPatch(u, u.id, { phone: '+37360111222' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
