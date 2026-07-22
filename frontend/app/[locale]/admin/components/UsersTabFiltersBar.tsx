import type { Dispatch, RefObject, SetStateAction } from 'react';

import { AdminFilterButton } from './AdminButtons';
import { AdminSearchInput } from './AdminTableShared';
import type { UsersFilters, UsersRoleFilter } from './usersTab.types';
import { USER_ROLE_FILTERS } from './usersTab.types';

type TabIndicatorStyle = { left: number; width: number };

type UsersTabFiltersBarProps = {
  tabsContainerRef: RefObject<HTMLDivElement | null>;
  individualTabRef: RefObject<HTMLButtonElement | null>;
  businessTabRef: RefObject<HTMLButtonElement | null>;
  adminTabRef: RefObject<HTMLButtonElement | null>;
  indicatorRef: RefObject<HTMLDivElement | null>;
  indicatorStyle: TabIndicatorStyle;
  filters: UsersFilters;
  setFilters: Dispatch<SetStateAction<UsersFilters>>;
  meta: { totalAll?: number; activeTotal?: number; inactiveTotal?: number } | null | undefined;
  userSearchPlaceholder: string;
  getRoleLabel: (role: UsersRoleFilter) => string;
  t: (key: string) => string;
};

function roleTabRef(
  role: UsersRoleFilter,
  refs: Pick<UsersTabFiltersBarProps, 'individualTabRef' | 'businessTabRef' | 'adminTabRef'>,
): RefObject<HTMLButtonElement | null> {
  if (role === 'Individual') {
    return refs.individualTabRef;
  }
  if (role === 'Business') {
    return refs.businessTabRef;
  }
  return refs.adminTabRef;
}

export function UsersTabFiltersBar({
  tabsContainerRef,
  individualTabRef,
  businessTabRef,
  adminTabRef,
  indicatorRef,
  indicatorStyle,
  filters,
  setFilters,
  meta,
  userSearchPlaceholder,
  getRoleLabel,
  t,
}: UsersTabFiltersBarProps) {
  const tabRefs = { individualTabRef, businessTabRef, adminTabRef };

  return (
    <div className="mb-4 md:mb-6 flex flex-col gap-4">
      <div className="border-b border-primary-500/20">
        <div ref={tabsContainerRef} className="relative overflow-x-auto scrollbar-hide">
          <div className="relative flex gap-1 min-w-max">
            {USER_ROLE_FILTERS.map((role) => (
              <button
                key={role}
                ref={roleTabRef(role, tabRefs)}
                type="button"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    roleFilter: role,
                  }))
                }
                className={`shrink-0 px-4 py-3 text-base font-semibold transition-all duration-300 relative z-10 whitespace-nowrap flex items-center ${
                  filters.roleFilter === role
                    ? 'text-primary-700 bg-primary-500/10 rounded-t-lg'
                    : 'text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:bg-primary-500/10'
                }`}
              >
                {getRoleLabel(role)}
              </button>
            ))}
            <div
              ref={indicatorRef}
              className="absolute bottom-0 h-0.5 bg-primary-700 transition-all duration-300 ease-in-out"
              style={{ left: `${indicatorStyle.left}px`, width: `${indicatorStyle.width}px` }}
            />
          </div>
        </div>
      </div>

      <AdminSearchInput
        value={filters.searchQuery}
        onChange={(e) =>
          setFilters((prev) => ({
            ...prev,
            searchQuery: e.target.value,
          }))
        }
        placeholder={userSearchPlaceholder}
      />

      <div className="pt-4 border-t border-primary-500/20 sm:border-t-0 sm:pt-0">
        <div className="flex flex-wrap gap-2 md:gap-3">
          <AdminFilterButton
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                activityFilter: 'All',
              }))
            }
            active={filters.activityFilter === 'All'}
            badge={meta?.totalAll ?? 0}
          >
            {t('admin.usersTab.activityFilterAll')}
          </AdminFilterButton>
          <AdminFilterButton
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                activityFilter: 'Active',
              }))
            }
            active={filters.activityFilter === 'Active'}
            badge={meta?.activeTotal ?? 0}
          >
            {t('admin.usersTab.activityFilterActive')}
          </AdminFilterButton>
          <AdminFilterButton
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                activityFilter: 'Inactive',
              }))
            }
            active={filters.activityFilter === 'Inactive'}
            badge={meta?.inactiveTotal ?? 0}
          >
            {t('admin.usersTab.activityFilterInactive')}
          </AdminFilterButton>
        </div>
      </div>
    </div>
  );
}
