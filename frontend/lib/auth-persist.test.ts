import type { User } from '@/lib/api';

import {
  AUTH_PERSIST_VERSION,
  migrateAuthPersistedState,
  toPersistedAuthUser,
  userFromPersisted,
} from './auth-persist';

const fullUser: User = {
  id: 'user-1',
  email: 'secret@example.com',
  type: 'Individual',
  phone: '+37360123456',
  firstName: 'Ion',
  lastName: 'Popescu',
  phoneVerified: true,
  emailVerified: false,
  preferredLocale: 'ro',
};

describe('auth-persist', () => {
  it('strips email and phone from persisted snapshot', () => {
    const persisted = toPersistedAuthUser(fullUser);
    expect(persisted).toEqual({
      id: 'user-1',
      type: 'Individual',
      firstName: 'Ion',
      lastName: 'Popescu',
      companyName: undefined,
      preferredLocale: 'ro',
      phoneVerified: true,
      emailVerified: false,
      hidePartnerPromoBanner: undefined,
      isPlatformPartner: undefined,
      active: undefined,
    });
    expect(persisted).not.toHaveProperty('email');
    expect(persisted).not.toHaveProperty('phone');
  });

  it('rehydrates User with email null for in-memory use until /me loads', () => {
    const persisted = toPersistedAuthUser(fullUser)!;
    expect(userFromPersisted(persisted).email).toBeNull();
    expect(userFromPersisted(persisted).id).toBe('user-1');
  });

  it('migrates legacy v2 full user payload to minimal persisted shape', () => {
    const migrated = migrateAuthPersistedState({ user: fullUser }, 2);
    expect(migrated.user?.email).toBeNull();
    expect(migrated.user?.id).toBe('user-1');
    expect(migrated.user).not.toHaveProperty('phone');
  });

  it('uses current persist version constant', () => {
    expect(AUTH_PERSIST_VERSION).toBe(3);
  });
});
