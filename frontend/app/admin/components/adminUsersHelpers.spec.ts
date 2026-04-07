import type { User } from '@/lib/api';

import { getPartnerListingsUntilNext, getUserSaveToastKey } from './adminUsersHelpers';

function userWithPartnerProgress(partnerListingProgress: number | undefined): User {
  return {
    id: 'u1',
    email: 'a@b.co',
    type: 'Business',
    partnerListingProgress,
  } as User;
}

describe('getPartnerListingsUntilNext', () => {
  it('returns 20 when cycle progress is 0', () => {
    expect(getPartnerListingsUntilNext(userWithPartnerProgress(0))).toBe(20);
  });

  it('returns 19 when one listing is counted in the cycle', () => {
    expect(getPartnerListingsUntilNext(userWithPartnerProgress(1))).toBe(19);
  });

  it('returns 1 when nineteen listings are counted in the cycle', () => {
    expect(getPartnerListingsUntilNext(userWithPartnerProgress(19))).toBe(1);
  });

  it('treats undefined progress as 0', () => {
    expect(getPartnerListingsUntilNext(userWithPartnerProgress(undefined))).toBe(20);
  });
});

describe('getUserSaveToastKey', () => {
  it('returns email confirmation toast key when confirmation email was sent', () => {
    expect(getUserSaveToastKey(true)).toBe('admin.usersTab.emailConfirmationSent');
  });

  it('returns regular save toast key when no confirmation email was sent', () => {
    expect(getUserSaveToastKey(false)).toBe('admin.usersTab.userSaveSuccess');
  });
});
