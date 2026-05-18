import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from '../../../users/application/users.service';

import { GetUserProfileUseCase } from './get-user-profile.use-case';
import { DismissPartnerPromoBannerUseCase } from './dismiss-partner-promo-banner.use-case';

describe('DismissPartnerPromoBannerUseCase', () => {
  let useCase: DismissPartnerPromoBannerUseCase;
  let usersService: jest.Mocked<Pick<UsersService, 'update'>>;
  let getUserProfileUseCase: jest.Mocked<Pick<GetUserProfileUseCase, 'execute'>>;

  beforeEach(async () => {
    usersService = { update: jest.fn() };
    getUserProfileUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DismissPartnerPromoBannerUseCase,
        { provide: UsersService, useValue: usersService },
        { provide: GetUserProfileUseCase, useValue: getUserProfileUseCase },
      ],
    }).compile();

    useCase = module.get(DismissPartnerPromoBannerUseCase);
  });

  it('should set hidePartnerPromoBanner and return profile', async () => {
    const profile = { id: 'u1', hidePartnerPromoBanner: true, boardSlug: 'slug' };
    usersService.update.mockResolvedValue({} as never);
    getUserProfileUseCase.execute.mockResolvedValue(profile as never);

    const result = await useCase.execute('u1');

    expect(usersService.update).toHaveBeenCalledWith('u1', { hidePartnerPromoBanner: true });
    expect(getUserProfileUseCase.execute).toHaveBeenCalledWith('u1');
    expect(result).toEqual(profile);
  });
});
