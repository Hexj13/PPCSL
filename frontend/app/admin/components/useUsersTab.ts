import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';

import {
  validateAdminEditUserForm,
  type AdminEditUserFieldKey,
  type AdminEditUserFormState,
  type AdminEditUserFormTouchedKey,
} from '@/app/admin/components/adminEditUserFormValidation';
import { getPartnerBalance, isBusinessUser } from '@/app/admin/components/adminUsersHelpers';
import { usePaginatedData } from '@/hooks/usePaginatedData';
import { useRefreshWhenVisible } from '@/hooks/useRefreshWhenVisible';
import { useTabIndicator } from '@/hooks/useTabIndicator';
import { useTranslation } from '@/hooks/useTranslation';
import type { User } from '@/lib/api';
import { adminApi } from '@/lib/api';
import { toast } from '@/lib/toast';

import type { UsersFilters, UsersRoleFilter, UsersTabProps } from './usersTab.types';
import { persistEditedUser } from './usersTabPersistEditedUser';

export function useUsersTab({ isActive, onViewUserListings }: UsersTabProps) {
  const { t } = useTranslation();
  const individualTabRef = useRef<HTMLButtonElement>(null);
  const businessTabRef = useRef<HTMLButtonElement>(null);
  const adminTabRef = useRef<HTMLButtonElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserForm, setEditUserForm] = useState<AdminEditUserFormState>({
    email: '',
    emailVerified: false,
    firstName: '',
    lastName: '',
    companyName: '',
    companyWebsiteUrl: '',
    additionalPhone: '',
    isPlatformPartner: false,
    freePromotionBalance: '0',
  });
  const [editUserFieldMessages, setEditUserFieldMessages] = useState<
    Partial<Record<AdminEditUserFieldKey, string>>
  >({});
  const [savingUserModal, setSavingUserModal] = useState(false);
  const [contactsUser, setContactsUser] = useState<User | null>(null);
  const [openUserActionsMenu, setOpenUserActionsMenu] = useState<{
    id: string;
    top: number;
    left: number;
  } | null>(null);

  const {
    data: users,
    loading,
    meta,
    page,
    filters,
    setFilters,
    setPage,
    setData,
    reload,
  } = usePaginatedData<User, UsersFilters>({
    fetchFn: async (pageNum, limitNum, filtersData) => {
      const userType = filtersData.roleFilter;
      const search = filtersData.searchQuery.trim() ? filtersData.searchQuery.trim() : undefined;
      const activity =
        filtersData.activityFilter === 'Active'
          ? 'active'
          : filtersData.activityFilter === 'Inactive'
            ? 'inactive'
            : undefined;

      const response = await adminApi.getAllUsers(pageNum, limitNum, search, userType, activity);
      return {
        data: response.data.data,
        meta: response.data.meta,
      };
    },
    limit: 50,
    initialFilters: {
      searchQuery: '',
      roleFilter: 'Individual',
      activityFilter: 'All',
    },
    showLoadingDelay: 300,
    debounceFilters: ['searchQuery'],
    debounceMs: 500,
  });

  useRefreshWhenVisible(isActive, () => {
    reload(true);
  });

  useEffect(() => {
    const onPointerDown = (event: Event) => {
      const target = event.target as HTMLElement;
      if (
        target.closest('[data-admin-actions-menu]') ||
        target.closest('[data-admin-actions-trigger]')
      ) {
        return;
      }
      setOpenUserActionsMenu(null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenUserActionsMenu(null);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    const closeMenu = () => {
      setOpenUserActionsMenu(null);
    };

    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);

    return () => {
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, []);

  const handleToggleStatus = useCallback(
    async (userId: string) => {
      const user = users.find((item) => item.id === userId);
      const previousActive = user?.active;

      setData((prev) =>
        prev.map((item) =>
          item.id === userId ? { ...item, active: item.active === false ? true : false } : item,
        ),
      );

      try {
        await adminApi.toggleUserStatus(userId);
        toast.success(t('admin.usersTab.userStatusUpdateSuccess'));
        void reload(true);
      } catch {
        if (previousActive !== undefined) {
          setData((prev) =>
            prev.map((item) => (item.id === userId ? { ...item, active: previousActive } : item)),
          );
        }
        toast.error(t('admin.usersTab.statusUpdateError'));
      }
    },
    [users, t, setData, reload],
  );

  const handleViewListings = useCallback(
    (user: User) => {
      onViewUserListings(user.id);
    },
    [onViewUserListings],
  );

  const handleRefreshUserListingDates = useCallback(
    async (userId: string) => {
      try {
        const { data } = await adminApi.refreshUserActiveListingDates(userId);
        const count = data.updated ?? 0;
        if (count > 0) {
          toast.success(t('admin.usersTab.refreshListingDatesSuccess', { count }));
        } else {
          toast(t('admin.usersTab.refreshListingDatesNone'));
        }
      } catch {
        toast.error(t('admin.usersTab.refreshListingDatesError'));
      }
    },
    [t],
  );

  const handleEditUser = useCallback((user: User) => {
    setEditingUser(user);
    setEditUserFieldMessages({});
    setEditUserForm({
      email: user.email ?? '',
      emailVerified: user.emailVerified === true,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      companyName: user.companyName ?? '',
      companyWebsiteUrl: user.companyWebsiteUrl ?? '',
      additionalPhone: user.additionalPhone ?? '',
      isPlatformPartner: user.isPlatformPartner === true,
      freePromotionBalance: String(getPartnerBalance(user)),
    });
  }, []);

  const handleEditUserFormChange = useCallback(
    (next: AdminEditUserFormState, field: AdminEditUserFormTouchedKey) => {
      setEditUserForm(next);
      setEditUserFieldMessages((prev) => {
        const copy = { ...prev };
        if (field === 'isPlatformPartner') {
          delete copy.freePromotionBalance;
        } else if (field !== 'emailVerified') {
          delete copy[field];
        }
        return copy;
      });
    },
    [],
  );

  const handleCloseEditModal = useCallback(() => {
    if (savingUserModal) return;
    setEditingUser(null);
    setEditUserFieldMessages({});
  }, [savingUserModal]);

  const partnerBalanceValue = useMemo(() => {
    const parsed = Number.parseInt(editUserForm.freePromotionBalance, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }, [editUserForm.freePromotionBalance]);

  const actionsUser = useMemo(() => {
    if (!openUserActionsMenu) {
      return null;
    }
    return users.find((user) => user.id === openUserActionsMenu.id) ?? null;
  }, [openUserActionsMenu, users]);

  const getRoleLabel = useCallback(
    (role: UsersRoleFilter) => {
      if (role === 'Individual') return t('admin.usersTab.individual');
      if (role === 'Business') return t('admin.usersTab.business');
      return t('admin.usersTab.admin');
    },
    [t],
  );

  const { indicatorRef, indicatorStyle } = useTabIndicator(
    filters.roleFilter,
    {
      Individual: individualTabRef,
      Business: businessTabRef,
      Admin: adminTabRef,
    },
    tabsContainerRef,
  );

  const showTypeColumn = false;
  const showPrimaryInfoColumn = filters.roleFilter !== 'Individual';
  const showEmailColumns = filters.roleFilter === 'Admin';
  const showPhoneColumn = filters.roleFilter === 'Individual';
  const showListingsColumn = true;
  const showPartnerColumns = filters.roleFilter === 'Business';
  const phoneColumnLabel = showPhoneColumn
    ? t('admin.usersTab.colPhone')
    : t('admin.usersTab.colPhones');
  const primaryInfoColumnLabel = showPartnerColumns
    ? t('admin.usersTab.colTitle')
    : t('admin.usersTab.colName');

  const userSearchPlaceholder = useMemo(() => {
    if (filters.roleFilter === 'Individual') {
      return t('admin.usersTab.searchPlaceholderIndividual');
    }
    if (filters.roleFilter === 'Business') {
      return t('admin.usersTab.searchPlaceholderBusiness');
    }
    return t('admin.usersTab.searchPlaceholderAdmin');
  }, [filters.roleFilter, t]);

  const handleSaveUserModal = useCallback(async () => {
    if (!editingUser) return;
    const business = isBusinessUser(editingUser);
    const validation = validateAdminEditUserForm({
      business,
      primaryPhone: editingUser.phone,
      form: editUserForm,
      t,
    });
    if (!validation.valid) {
      setEditUserFieldMessages(validation.fieldMessages);
      if (validation.firstToastMessage) {
        toast.error(validation.firstToastMessage);
      }
      return;
    }
    setEditUserFieldMessages({});
    setSavingUserModal(true);
    const result = await persistEditedUser({
      editingUser,
      editUserForm,
      partnerBalanceValue,
      t,
    });
    if (result.ok) {
      setData((prev) =>
        prev.map((u) => (u.id === result.merged.id ? { ...u, ...result.merged } : u)),
      );
      toast.success(t(result.toastKey));
      setEditingUser(null);
      setEditUserFieldMessages({});
    } else {
      setEditUserFieldMessages(result.fieldMessages);
      toast.error(result.toastMessage);
    }
    setSavingUserModal(false);
  }, [editingUser, editUserForm, partnerBalanceValue, setData, t]);

  const handleUserActionsClick = useCallback(
    (user: User, event: ReactMouseEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      setOpenUserActionsMenu((current) =>
        current?.id === user.id
          ? null
          : {
              id: user.id,
              top: rect.bottom + 6,
              left: rect.right,
            },
      );
    },
    [],
  );

  const closeActionsMenu = useCallback(() => {
    setOpenUserActionsMenu(null);
  }, []);

  return {
    t,
    individualTabRef,
    businessTabRef,
    adminTabRef,
    tabsContainerRef,
    indicatorRef,
    indicatorStyle,
    editingUser,
    editUserForm,
    editUserFieldMessages,
    savingUserModal,
    contactsUser,
    setContactsUser,
    openUserActionsMenu,
    users,
    loading,
    meta,
    page,
    filters,
    setFilters,
    setPage,
    handleToggleStatus,
    handleViewListings,
    handleRefreshUserListingDates,
    handleEditUser,
    handleEditUserFormChange,
    handleCloseEditModal,
    handleSaveUserModal,
    handleUserActionsClick,
    closeActionsMenu,
    getRoleLabel,
    userSearchPlaceholder,
    showTypeColumn,
    showPrimaryInfoColumn,
    showEmailColumns,
    showPhoneColumn,
    showListingsColumn,
    showPartnerColumns,
    phoneColumnLabel,
    primaryInfoColumnLabel,
    actionsUser,
  };
}
