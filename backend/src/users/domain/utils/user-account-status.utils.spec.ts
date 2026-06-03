import { isSelfDeletedUser } from './user-account-status.utils';

describe('isSelfDeletedUser', () => {
  it('returns false for active users', () => {
    expect(
      isSelfDeletedUser({
        active: true,
        email: null,
        phone: null,
        firstName: null,
        lastName: null,
        companyName: null,
      }),
    ).toBe(false);
  });

  it('returns true for inactive users with cleared profile fields', () => {
    expect(
      isSelfDeletedUser({
        active: false,
        email: null,
        phone: null,
        firstName: null,
        lastName: null,
        companyName: null,
      }),
    ).toBe(true);
  });

  it('returns false for admin-deactivated users with profile data', () => {
    expect(
      isSelfDeletedUser({
        active: false,
        email: 'user@example.com',
        phone: '+37370123456',
        firstName: 'Test',
        lastName: null,
        companyName: null,
      }),
    ).toBe(false);
  });
});
