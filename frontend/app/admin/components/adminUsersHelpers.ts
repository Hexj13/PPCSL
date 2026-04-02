import type { User } from '@/lib/api';

export function isBusinessUser(user: User): boolean {
  return user.type === 'Business';
}

export function getTypeLabelKey(userType: string): string {
  if (userType === 'Admin') return 'admin.usersTab.admin';
  if (userType === 'Business') return 'admin.usersTab.business';
  return 'admin.usersTab.individual';
}

export function hasContactInfo(user: User): boolean {
  return !!(user.firstName || user.lastName || user.companyName || user.email || user.phone);
}

export function getPartnerBalance(user: User): number {
  return Math.max(0, user.freePromotionBalance ?? 0);
}

export function getPartnerProgress(user: User): number {
  return Math.max(0, user.partnerListingProgress ?? 0);
}

export function getPartnerListingsUntilNext(user: User): number {
  const progress = Math.max(0, user.partnerListingProgress ?? 0);
  return 20 - (progress % 20 || 0);
}
