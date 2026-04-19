import { hasContactInfo, isBusinessUser } from '@/app/admin/components/adminUsersHelpers';
import type { User } from '@/lib/api';

import type { ActionMenuItem } from './AdminTableShared';

export type UsersTabMenuHandlers = {
  onCloseMenu: () => void;
  onViewListings: (user: User) => void;
  onRefreshListingDates: (userId: string) => void;
  onShowContacts: (user: User) => void;
  onEdit: (user: User) => void;
  onToggleStatus: (userId: string) => void;
};

export type UsersTabTranslate = (key: string) => string;

function hasActiveListingsForViewListingsMenu(user: User): boolean {
  const hasActiveInListings =
    user.listings?.some((listing) => listing.status === 'Active') ?? false;
  if (hasActiveInListings) {
    return true;
  }
  return typeof user.listingCountActive === 'number' && user.listingCountActive > 0;
}

function hasActiveListingsForRefreshDatesMenu(user: User): boolean {
  const listings = user.listings;
  if (listings != null && listings.length > 0) {
    return listings.some((listing) => listing.status === 'Active');
  }
  return typeof user.listingCountActive === 'number' && user.listingCountActive > 0;
}

function pushViewListingsIfNeeded(
  user: User,
  items: ActionMenuItem[],
  t: UsersTabTranslate,
  h: UsersTabMenuHandlers,
) {
  if (!hasActiveListingsForViewListingsMenu(user)) {
    return;
  }
  items.push({
    id: 'view-listings',
    label: t('admin.usersTab.viewListings'),
    onSelect: () => {
      h.onCloseMenu();
      h.onViewListings(user);
    },
  });
}

function pushRefreshDatesIfNeeded(
  user: User,
  items: ActionMenuItem[],
  t: UsersTabTranslate,
  h: UsersTabMenuHandlers,
) {
  if (!hasActiveListingsForRefreshDatesMenu(user)) {
    return;
  }
  items.push({
    id: 'refresh-listing-dates',
    label: t('admin.usersTab.refreshListingDates'),
    onSelect: () => {
      h.onCloseMenu();
      void h.onRefreshListingDates(user.id);
    },
  });
}

function pushShowContactsIfNeeded(
  user: User,
  items: ActionMenuItem[],
  t: UsersTabTranslate,
  h: UsersTabMenuHandlers,
) {
  if (!isBusinessUser(user) && user.type !== 'Individual') {
    return;
  }
  items.push({
    id: 'show-contacts',
    label: t('admin.usersTab.showContacts'),
    onSelect: () => {
      h.onCloseMenu();
      h.onShowContacts(user);
    },
  });
}

export function buildUsersTabActionMenuItems(
  user: User,
  t: UsersTabTranslate,
  h: UsersTabMenuHandlers,
): ActionMenuItem[] {
  const items: ActionMenuItem[] = [];
  pushViewListingsIfNeeded(user, items, t, h);
  pushRefreshDatesIfNeeded(user, items, t, h);
  pushShowContactsIfNeeded(user, items, t, h);
  items.push({
    id: 'edit',
    label: t('common.edit'),
    onSelect: () => {
      h.onCloseMenu();
      h.onEdit(user);
    },
  });
  items.push({
    id: 'toggle-status',
    label: user.active !== false ? t('admin.usersTab.deactivate') : t('admin.usersTab.activate'),
    onSelect: () => {
      h.onCloseMenu();
      void h.onToggleStatus(user.id);
    },
    disabled: !hasContactInfo(user),
    withTopDivider: true,
  });
  return items;
}
