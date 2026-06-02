import type { User } from '@/lib/api';

export type PersistedAuthUser = Pick<
  User,
  | 'id'
  | 'type'
  | 'firstName'
  | 'lastName'
  | 'companyName'
  | 'preferredLocale'
  | 'phoneVerified'
  | 'emailVerified'
  | 'hidePartnerPromoBanner'
  | 'isPlatformPartner'
  | 'active'
>;

export const AUTH_PERSIST_VERSION = 3;

export function toPersistedAuthUser(user: User | null): PersistedAuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    type: user.type,
    firstName: user.firstName,
    lastName: user.lastName,
    companyName: user.companyName,
    preferredLocale: user.preferredLocale,
    phoneVerified: user.phoneVerified,
    emailVerified: user.emailVerified,
    hidePartnerPromoBanner: user.hidePartnerPromoBanner,
    isPlatformPartner: user.isPlatformPartner,
    active: user.active,
  };
}

export function userFromPersisted(persisted: PersistedAuthUser): User {
  return {
    ...persisted,
    email: null,
  };
}

export function migrateAuthPersistedState(
  persisted: unknown,
  fromVersion: number,
): { user: User | null } {
  const p = persisted as { user?: User | PersistedAuthUser | null } | null | undefined;
  const raw = p?.user ?? null;
  if (!raw) {
    return { user: null };
  }
  if (fromVersion < AUTH_PERSIST_VERSION) {
    return { user: userFromPersisted(toPersistedAuthUser(raw as User)!) };
  }
  return { user: userFromPersisted(raw as PersistedAuthUser) };
}
