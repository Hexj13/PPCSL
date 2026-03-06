'use client';

import { useCallback, useEffect, useState } from 'react';

import { CopyButton } from '@/components/common/CopyButton';
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

function getDisplayName(user: User): string {
  if (user.firstName) {
    return user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName;
  }
  return user.companyName || user.email || user.phone || '';
}

function getTypeLabelKey(userType: string): string {
  if (userType === 'Admin') return 'admin.usersTab.admin';
  if (userType === 'Business') return 'admin.usersTab.business';
  return 'admin.usersTab.individual';
}

function hasContactInfo(user: User): boolean {
  return !!(user.firstName || user.lastName || user.companyName || user.email || user.phone);
}

interface AdminUserCardProps {
  user: User;
  t: (key: string, values?: Record<string, number>) => string;
  onViewListings: (user: User) => void;
  onToggleStatus: (userId: string) => void;
}

function AdminUserCard({ user, t, onViewListings, onToggleStatus }: AdminUserCardProps) {
  const displayName = getDisplayName(user) || t('admin.usersTab.deletedUser');
  const listingCount = user.listings?.length ?? 0;

  return (
    <div className="card p-4 md:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm md:text-base text-text-secondary font-mono break-all">
                {t('admin.usersTab.id')} {user.id}
              </span>
              <CopyButton text={user.id} label="ID" />
            </div>
            <h3 className="text-sm md:text-base font-bold text-text-primary wrap-break-word">
              {displayName}
            </h3>
            {user.companyName && (
              <p
                className="text-sm md:text-base mt-1 wrap-break-word"
                style={{ color: 'rgb(var(--text-secondary-rgb))' }}
              >
                {user.companyName}
              </p>
            )}
          </div>
          <div
            className="space-y-1 text-sm md:text-base"
            style={{ color: 'rgb(var(--text-secondary-rgb))' }}
          >
            {user.email ? (
              <div className="wrap-break-word">
                <span className="text-primary-700">{t('admin.usersTab.email')}</span> {user.email}
              </div>
            ) : (
              <div>
                <span className="text-primary-700">{t('admin.usersTab.email')}</span>{' '}
                <span className="text-text-secondary">{t('admin.usersTab.unavailable')}</span>
              </div>
            )}
            {user.phone ? (
              <div>
                <span className="text-primary-700">{t('admin.usersTab.phone')}</span> {user.phone}
              </div>
            ) : (
              <div>
                <span className="text-primary-700">{t('admin.usersTab.phone')}</span>{' '}
                <span className="text-text-secondary">{t('admin.usersTab.unavailable')}</span>
              </div>
            )}
            <div>
              <span className="text-primary-700">{t('admin.usersTab.type')}</span>{' '}
              {t(getTypeLabelKey(user.type))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-primary-700">{t('admin.usersTab.status')}</span>
              <span
                className={`px-2 py-1 rounded text-sm md:text-base font-semibold text-text-secondary ${
                  user.active !== false ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}
              >
                {user.active !== false ? t('admin.usersTab.active') : t('admin.usersTab.inactive')}
              </span>
            </div>
            <div>
              <span className="text-primary-700">{t('admin.usersTab.listings')}</span>{' '}
              {listingCount}
            </div>
          </div>
        </div>
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2 w-full xl:w-auto shrink-0">
          {listingCount > 0 && (
            <button
              onClick={() => onViewListings(user)}
              className="text-primary-700 font-medium text-base hover-only:hover:text-primary-900 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 border-primary-700 hover-only:hover:border-primary-900 bg-primary-500/10 select-none w-full xl:w-auto h-[48px]"
            >
              {t('admin.usersTab.viewListings', { count: listingCount })}
            </button>
          )}
          {hasContactInfo(user) && (
            <button
              onClick={() => onToggleStatus(user.id)}
              className={`font-medium text-base transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 select-none w-full xl:w-auto h-[48px] ${
                user.active !== false
                  ? 'text-text-secondary hover-only:hover:text-text-primary border-red-500/40 hover-only:hover:border-red-500/60 bg-red-500/20 hover-only:hover:bg-red-500/30'
                  : 'text-primary-700 hover-only:hover:text-primary-900 border-primary-700 hover-only:hover:border-primary-900 bg-primary-500/10'
              }`}
            >
              {user.active !== false
                ? t('admin.usersTab.deactivate')
                : t('admin.usersTab.activate')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function UsersTab({ onViewUserListings }: UsersTabProps) {
  const { t } = useTranslation();
  const [roleCounts, setRoleCounts] = useState({ All: 0, Individual: 0, Business: 0, Admin: 0 });

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

  const loadRoleCounts = useCallback(async () => {
    try {
      const [all, individual, business, admin] = await Promise.all([
        adminApi.getAllUsers(1, 1),
        adminApi.getAllUsers(1, 1, undefined, 'Individual'),
        adminApi.getAllUsers(1, 1, undefined, 'Business'),
        adminApi.getAllUsers(1, 1, undefined, 'Admin'),
      ]);
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
    void loadRoleCounts();
  }, [loadRoleCounts]);

  const handleToggleStatus = useCallback(
    async (userId: string) => {
      const user = users.find((u) => u.id === userId);
      const previousActive = user?.active;

      setData((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, active: user.active === false ? true : false } : user,
        ),
      );

      try {
        await adminApi.toggleUserStatus(userId);
        toast.success(t('admin.usersTab.userStatusUpdateSuccess'));
        await loadRoleCounts();
      } catch {
        if (previousActive !== undefined) {
          setData((prev) =>
            prev.map((user) => (user.id === userId ? { ...user, active: previousActive } : user)),
          );
        }
        toast.error(t('admin.usersTab.statusUpdateError'));
      }
    },
    [users, t, loadRoleCounts, setData],
  );

  const handleViewListings = useCallback(
    (user: User) => {
      onViewUserListings(user.id);
    },
    [onViewUserListings],
  );

  return (
    <>
      {showSkeleton && (
        <div>
          <div className="mb-4 md:mb-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 h-[48px] md:h-[52px] bg-bg-secondary/30 rounded-lg animate-pulse" />
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-9 md:h-10 w-24 md:w-28 bg-bg-secondary/30 rounded-lg animate-pulse"
                />
              ))}
            </div>
          </div>
          <div className="mb-3 md:mb-4 h-4 md:h-5 bg-bg-secondary/30 rounded-sm w-40 md:w-48 animate-pulse" />
          <div className="space-y-3 md:space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-4 md:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 space-y-2 md:space-y-3">
                    <div className="h-3 md:h-4 bg-bg-secondary/30 rounded-sm w-28 md:w-32 animate-pulse" />
                    <div className="h-5 md:h-6 bg-bg-secondary/40 rounded-sm w-3/4 animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-3 md:h-4 bg-bg-secondary/30 rounded-sm w-full animate-pulse" />
                      <div className="h-3 md:h-4 bg-bg-secondary/30 rounded-sm w-5/6 animate-pulse" />
                      <div className="h-3 md:h-4 bg-bg-secondary/30 rounded-sm w-4/6 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex flex-row lg:flex-col gap-2">
                    <div className="h-8 md:h-10 bg-bg-secondary/30 rounded-sm flex-1 lg:flex-none lg:w-32 animate-pulse" />
                    <div className="h-8 md:h-10 bg-bg-secondary/30 rounded-sm flex-1 lg:flex-none lg:w-28 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!showSkeleton && (
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

          {users.length === 0 ? (
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
                  />
                ))}
              </div>

              {meta && meta.totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={meta.totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
