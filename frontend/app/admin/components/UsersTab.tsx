'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AdminUserCard } from '@/app/admin/components/AdminUserCard';
import { EditUserPartnerModal } from '@/app/admin/components/EditUserPartnerModal';
import {
  validateAdminEditUserForm,
  type AdminEditUserFieldKey,
  type AdminEditUserFormState,
  type AdminEditUserFormTouchedKey,
} from '@/app/admin/components/adminEditUserFormValidation';
import {
  getPartnerBalance,
  getUserSaveToastKey,
  isBusinessUser,
} from '@/app/admin/components/adminUsersHelpers';
import { EmptyState } from '@/components/common/EmptyState';
import { useLoadingState } from '@/hooks/useLoadingState';
import { usePaginatedData } from '@/hooks/usePaginatedData';
import { useTranslation } from '@/hooks/useTranslation';
import type { User } from '@/lib/api';
import { adminApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import { Pagination } from '@/ui';

interface UsersTabProps {
  onViewUserListings: (_userId: string) => void;
}

interface UsersFilters {
  searchQuery: string;
  roleFilter: 'All' | 'Individual' | 'Business' | 'Admin';
}

export function UsersTab({ onViewUserListings }: UsersTabProps) {
  const { t } = useTranslation();
  const [roleCounts, setRoleCounts] = useState({ All: 0, Individual: 0, Business: 0, Admin: 0 });
  const roleCountsGenerationRef = useRef(0);
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

  const {
    data: users,
    loading,
    meta,
    page,
    filters,
    setFilters,
    setPage,
    setData,
  } = usePaginatedData<User, UsersFilters>({
    fetchFn: async (pageNum, limitNum, filtersData) => {
      const userType = filtersData.roleFilter === 'All' ? undefined : filtersData.roleFilter;
      const search = filtersData.searchQuery.trim() ? filtersData.searchQuery.trim() : undefined;

      const response = await adminApi.getAllUsers(pageNum, limitNum, search, userType);
      return {
        data: response.data.data,
        meta: {
          total: response.data.meta.total || 0,
          page: response.data.meta.page || 1,
          limit: response.data.meta.limit || limitNum,
          totalPages: response.data.meta.totalPages || 1,
        },
      };
    },
    limit: 50,
    initialFilters: {
      searchQuery: '',
      roleFilter: 'All',
    },
    showLoadingDelay: 300,
    debounceFilters: ['searchQuery'],
    debounceMs: 500,
  });

  const { visible: showSkeleton } = useLoadingState({
    isLoading: loading,
    immediate: false,
    showDelay: 200,
    minDisplayTime: 1000,
  });

  const loadRoleCounts = useCallback(async (search?: string) => {
    const generation = ++roleCountsGenerationRef.current;
    const q = search?.trim() || undefined;
    try {
      const [all, individual, business, admin] = await Promise.all([
        adminApi.getAllUsers(1, 1, q),
        adminApi.getAllUsers(1, 1, q, 'Individual'),
        adminApi.getAllUsers(1, 1, q, 'Business'),
        adminApi.getAllUsers(1, 1, q, 'Admin'),
      ]);
      if (roleCountsGenerationRef.current !== generation) return;
      setRoleCounts({
        All: all.data.meta?.total || 0,
        Individual: individual.data.meta?.total || 0,
        Business: business.data.meta?.total || 0,
        Admin: admin.data.meta?.total || 0,
      });
    } catch {
      // Ignore errors for role counts
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadRoleCounts(filters.searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.searchQuery, loadRoleCounts]);

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
        await loadRoleCounts(filters.searchQuery);
      } catch {
        if (previousActive !== undefined) {
          setData((prev) =>
            prev.map((item) => (item.id === userId ? { ...item, active: previousActive } : item)),
          );
        }
        toast.error(t('admin.usersTab.statusUpdateError'));
      }
    },
    [users, t, loadRoleCounts, setData, filters.searchQuery],
  );

  const handleViewListings = useCallback(
    (user: User) => {
      onViewUserListings(user.id);
    },
    [onViewUserListings],
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
    try {
      const emailTrim = editUserForm.email.trim();
      const profilePayload = business
        ? {
            email: emailTrim,
            companyName: editUserForm.companyName.trim(),
            companyWebsiteUrl: editUserForm.companyWebsiteUrl.trim(),
            additionalPhone: editUserForm.additionalPhone.trim(),
          }
        : {
            email: emailTrim,
            firstName: editUserForm.firstName.trim(),
            lastName: editUserForm.lastName.trim(),
          };

      const profileResponse = await adminApi.updateUserProfile(editingUser.id, {
        ...profilePayload,
        ...(emailTrim !== '' ? { emailVerified: editUserForm.emailVerified } : {}),
      });
      let merged: User = { ...editingUser, ...profileResponse.data.user };

      if (business) {
        const partnerResponse = await adminApi.updateUserPartnerSettings(editingUser.id, {
          isPlatformPartner: editUserForm.isPlatformPartner,
          freePromotionBalance: editUserForm.isPlatformPartner ? partnerBalanceValue : 0,
        });
        merged = { ...merged, ...partnerResponse.data };
      }

      setData((prev) => prev.map((u) => (u.id === merged.id ? { ...u, ...merged } : u)));
      toast.success(t(getUserSaveToastKey(profileResponse.data.emailConfirmationSent)));
      setEditingUser(null);
      setEditUserFieldMessages({});
    } catch (err: unknown) {
      const ax =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string; errorKey?: string } } })
          : null;
      const data = ax?.response?.data;
      const msg =
        typeof data?.message === 'string' ? data.message : t('admin.usersTab.userSaveError');
      const errorKey = typeof data?.errorKey === 'string' ? data.errorKey : undefined;
      if (errorKey === 'errors.emailAlreadyExists') {
        setEditUserFieldMessages({ email: msg });
      } else if (errorKey === 'errors.additionalPhoneSameAsPrimary') {
        setEditUserFieldMessages({ additionalPhone: msg });
      }
      toast.error(msg);
    } finally {
      setSavingUserModal(false);
    }
  }, [editingUser, editUserForm, partnerBalanceValue, setData, t]);

  const showInitialSkeleton = showSkeleton && users.length === 0;

  return (
    <div>
      <div className="mb-4 md:mb-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                searchQuery: e.target.value,
              }))
            }
            placeholder={t('admin.usersTab.searchPlaceholder')}
            className="w-full px-4 py-2.5 md:py-3 rounded-lg bg-bg-secondary border-2 border-primary-700 text-text-primary placeholder:text-text-secondary focus:outline-hidden focus:border-primary-900 transition-all duration-200 h-[48px] md:h-[52px] text-sm md:text-base"
          />
        </div>

        <div className="pt-4 border-t border-primary-500/20 sm:border-t-0 sm:pt-0 flex flex-wrap gap-2 md:gap-3">
          {(['All', 'Individual', 'Business', 'Admin'] as const).map((role) => (
            <button
              key={role}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  roleFilter: role,
                }))
              }
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium text-base transition-colors ${
                filters.roleFilter === role
                  ? 'bg-primary-500/10 border-2 border-primary-700 text-primary-700'
                  : 'bg-bg-secondary hover-only:hover:bg-bg-base border-2 border-primary-700 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900'
              }`}
            >
              {role === 'All'
                ? t('admin.usersTab.allRoles')
                : role === 'Individual'
                  ? t('admin.usersTab.individual')
                  : role === 'Business'
                    ? t('admin.usersTab.business')
                    : t('admin.usersTab.admin')}
              {role !== 'All' && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500/20 text-sm">
                  {roleCounts[role]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {showInitialSkeleton ? (
        <div>
          <div className="mb-3 md:mb-4 h-4 md:h-5 bg-bg-secondary/30 rounded-sm w-40 md:w-48 animate-pulse" />
          <div className="space-y-3 md:space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-4 md:p-5">
                <div className="h-3 md:h-4 bg-bg-secondary/30 rounded-sm w-48 animate-pulse mb-4" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
                  <div className="h-4 bg-bg-secondary/30 rounded-sm w-full animate-pulse" />
                  <div className="h-4 bg-bg-secondary/30 rounded-sm w-full animate-pulse" />
                  <div className="h-4 bg-bg-secondary/30 rounded-sm w-5/6 animate-pulse" />
                  <div className="h-4 bg-bg-secondary/30 rounded-sm w-4/6 animate-pulse" />
                </div>
                <div className="pt-3 border-t border-primary-500/20 flex flex-col lg:flex-row gap-3">
                  <div className="h-5 bg-bg-secondary/30 rounded-sm w-28 animate-pulse" />
                  <div className="flex flex-col xl:flex-row gap-2 xl:ml-auto">
                    <div className="h-12 bg-bg-secondary/30 rounded-lg w-full xl:w-36 animate-pulse" />
                    <div className="h-12 bg-bg-secondary/30 rounded-lg w-full xl:w-36 animate-pulse" />
                    <div className="h-12 bg-bg-secondary/30 rounded-lg w-full xl:w-36 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : users.length === 0 ? (
        <EmptyState message={t('admin.usersTab.noUsers')} className="py-10 md:py-12" />
      ) : (
        <>
          <div className="space-y-3 md:space-y-4">
            {users.map((user) => (
              <AdminUserCard
                key={user.id}
                user={user}
                t={t}
                onViewListings={handleViewListings}
                onToggleStatus={handleToggleStatus}
                onEdit={handleEditUser}
              />
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <Pagination currentPage={page} totalPages={meta.totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      <EditUserPartnerModal
        user={editingUser}
        isOpen={editingUser !== null}
        saving={savingUserModal}
        formState={editUserForm}
        fieldMessages={editUserFieldMessages}
        onClose={handleCloseEditModal}
        onFormChange={handleEditUserFormChange}
        onSubmit={handleSaveUserModal}
        t={t}
      />
    </div>
  );
}
