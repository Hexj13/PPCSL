import { isBusinessUser } from '@/app/admin/components/adminUsersHelpers';
import type { User } from '@/lib/api';

export const USERS_TABLE_UNAVAILABLE = '—';

export function buildUsersTableRowCounts(user: User): {
  listingCountTotal: number;
  listingCountActive: number;
} {
  const listings = user.listings ?? [];
  const listingCountTotal =
    typeof user.listingCountTotal === 'number' ? user.listingCountTotal : listings.length;
  const listingCountActive =
    typeof user.listingCountActive === 'number'
      ? user.listingCountActive
      : listings.filter((l) => l.status === 'Active').length;
  return { listingCountTotal, listingCountActive };
}

export function buildUsersTableRowPhones(user: User): {
  displayPrimaryPhone: string;
  displayAdditionalPhone: string;
} {
  const primaryPhoneRaw = user.phone?.trim() || '';
  const additionalPhoneRaw = user.additionalPhone?.trim() || '';
  const normalizedPrimaryPhone = primaryPhoneRaw.replace(/\s+/g, '');
  const normalizedAdditionalPhone = additionalPhoneRaw.replace(/\s+/g, '');
  const displayPrimaryPhone = primaryPhoneRaw || additionalPhoneRaw || USERS_TABLE_UNAVAILABLE;
  const displayAdditionalPhone =
    primaryPhoneRaw && additionalPhoneRaw && normalizedPrimaryPhone !== normalizedAdditionalPhone
      ? additionalPhoneRaw
      : '';
  return { displayPrimaryPhone, displayAdditionalPhone };
}

export function buildUsersTableRowDisplayName(user: User): string {
  const companyName = user.companyName?.trim() || USERS_TABLE_UNAVAILABLE;
  const fullName = `${user.firstName?.trim() || ''} ${user.lastName?.trim() || ''}`.trim();
  return isBusinessUser(user) ? companyName : fullName || USERS_TABLE_UNAVAILABLE;
}

export function isUsersTablePartnerEnabled(user: User): boolean {
  return isBusinessUser(user) && user.isPlatformPartner === true;
}
