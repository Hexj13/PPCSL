import { UserType } from '../../common/types';

import { User } from './user.entity';

const defaults: Partial<User> = {
  id: 'user-1',
  type: 'Individual' as UserType,
  email: 'test@example.com',
  password: 'hashed',
  phone: '+37370123456',
  firstName: 'John',
  lastName: 'Doe',
  companyName: null,
  companyWebsiteUrl: null,
  board_slug: null,
  active: true,
};

describe('User', () => {
  const baseUser = (overrides: Partial<User> = {}): User =>
    Object.assign(new User(), { ...defaults, ...overrides });

  describe('getDisplayName', () => {
    it('returns companyName for Business when set', () => {
      const user = baseUser({ type: 'Business' as UserType, companyName: 'Acme Inc.' });
      expect(user.getDisplayName()).toBe('Acme Inc.');
    });

    it('returns firstName when not Business or no companyName', () => {
      const user = baseUser({ firstName: 'Jane', companyName: null });
      expect(user.getDisplayName()).toBe('Jane');
    });

    it('returns phone when no firstName', () => {
      const user = baseUser({ firstName: null, lastName: null, phone: '+37370000000' });
      expect(user.getDisplayName()).toBe('+37370000000');
    });

    it('returns empty string when no companyName, firstName, phone', () => {
      const user = baseUser({
        type: 'Business' as UserType,
        companyName: null,
        firstName: null,
        phone: null,
      });
      expect(user.getDisplayName()).toBe('');
    });
  });

  describe('canCreateListing', () => {
    it('returns true when activeCount < limit', () => {
      expect(baseUser().canCreateListing(5, 10)).toBe(true);
    });

    it('returns false when activeCount >= limit', () => {
      expect(baseUser().canCreateListing(10, 10)).toBe(false);
      expect(baseUser().canCreateListing(11, 10)).toBe(false);
    });
  });

  describe('deactivate', () => {
    it('clears personal data and sets active to false', () => {
      const user = baseUser({
        email: 'a@b.com',
        phone: '+373',
        firstName: 'A',
        lastName: 'B',
        companyName: 'C',
        companyWebsiteUrl: 'https://c.com',
        active: true,
      });
      user.deactivate();
      expect(user.email).toBeNull();
      expect(user.phone).toBeNull();
      expect(user.firstName).toBeNull();
      expect(user.lastName).toBeNull();
      expect(user.companyName).toBeNull();
      expect(user.companyWebsiteUrl).toBeNull();
      expect(user.active).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('returns true when type is Admin', () => {
      expect(baseUser({ type: 'Admin' as UserType }).isAdmin()).toBe(true);
    });

    it('returns false when type is Individual or Business', () => {
      expect(baseUser({ type: 'Individual' as UserType }).isAdmin()).toBe(false);
      expect(baseUser({ type: 'Business' as UserType }).isAdmin()).toBe(false);
    });
  });
});
