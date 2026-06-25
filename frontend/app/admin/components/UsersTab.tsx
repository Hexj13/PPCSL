'use client';

import { EditUserPartnerModal } from '@/app/admin/components/EditUserPartnerModal';

import { AdminActionsMenuPortal } from './AdminTableShared';
import { UsersTabContactsModal } from './UsersTabContactsModal';
import { UsersTabFiltersBar } from './UsersTabFiltersBar';
import { UsersTabTable } from './UsersTabTable';
import { useUsersTab } from './useUsersTab';
import type { UsersTabProps } from './usersTab.types';
import { buildUsersTabActionMenuItems } from './usersTabBuildActionMenuItems';

export function UsersTab(props: UsersTabProps) {
  const s = useUsersTab(props);

  const menuItems =
    s.actionsUser !== null
      ? buildUsersTabActionMenuItems(s.actionsUser, s.t, {
          onCloseMenu: s.closeActionsMenu,
          onViewListings: s.handleViewListings,
          onRefreshListingDates: s.handleRefreshUserListingDates,
          onShowContacts: s.setContactsUser,
          onEdit: s.handleEditUser,
          onToggleStatus: s.handleToggleStatus,
        })
      : [];

  return (
    <div data-testid="admin-users-tab-content">
      <UsersTabFiltersBar
        tabsContainerRef={s.tabsContainerRef}
        individualTabRef={s.individualTabRef}
        businessTabRef={s.businessTabRef}
        adminTabRef={s.adminTabRef}
        indicatorRef={s.indicatorRef}
        indicatorStyle={s.indicatorStyle}
        filters={s.filters}
        setFilters={s.setFilters}
        meta={s.meta}
        userSearchPlaceholder={s.userSearchPlaceholder}
        getRoleLabel={s.getRoleLabel}
        t={s.t}
      />

      <UsersTabTable
        users={s.users}
        loading={s.loading}
        meta={s.meta}
        page={s.page}
        onPageChange={s.setPage}
        showPhoneColumn={s.showPhoneColumn}
        showPrimaryInfoColumn={s.showPrimaryInfoColumn}
        showTypeColumn={s.showTypeColumn}
        showEmailColumns={s.showEmailColumns}
        showListingsColumn={s.showListingsColumn}
        showPartnerColumns={s.showPartnerColumns}
        phoneColumnLabel={s.phoneColumnLabel}
        primaryInfoColumnLabel={s.primaryInfoColumnLabel}
        openActionsUserId={s.openUserActionsMenu?.id ?? null}
        onUserActionsClick={s.handleUserActionsClick}
        t={s.t}
      />

      <AdminActionsMenuPortal
        isOpen={Boolean(s.openUserActionsMenu && s.actionsUser)}
        top={s.openUserActionsMenu?.top ?? 0}
        left={s.openUserActionsMenu?.left ?? 0}
        menuDataAttr="data-user-actions-menu"
        items={menuItems}
      />

      <UsersTabContactsModal
        contactsUser={s.contactsUser}
        onClose={() => s.setContactsUser(null)}
        t={s.t}
      />

      <EditUserPartnerModal
        user={s.editingUser}
        isOpen={s.editingUser !== null}
        saving={s.savingUserModal}
        formState={s.editUserForm}
        fieldMessages={s.editUserFieldMessages}
        onClose={s.handleCloseEditModal}
        onFormChange={s.handleEditUserFormChange}
        onSubmit={s.handleSaveUserModal}
        t={s.t}
      />
    </div>
  );
}
