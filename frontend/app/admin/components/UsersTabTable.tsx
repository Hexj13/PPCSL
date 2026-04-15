import type { MouseEvent } from 'react';

import type { User } from '@/lib/api';
import { Pagination } from '@/ui';

import { AdminTableState, adminTableHeaderClassName } from './AdminTableShared';
import { UsersTableRow } from './UsersTableRow';

type UsersTabTableTranslate = (key: string, values?: Record<string, string | number>) => string;

export type UsersTabTableProps = {
  users: User[];
  loading: boolean;
  meta: { totalPages?: number } | null | undefined;
  page: number;
  onPageChange: (page: number) => void;
  showPhoneColumn: boolean;
  showPrimaryInfoColumn: boolean;
  showTypeColumn: boolean;
  showEmailColumns: boolean;
  showListingsColumn: boolean;
  showPartnerColumns: boolean;
  phoneColumnLabel: string;
  primaryInfoColumnLabel: string;
  openActionsUserId: string | null;
  onUserActionsClick: (user: User, event: MouseEvent<HTMLButtonElement>) => void;
  t: UsersTabTableTranslate;
};

export function UsersTabTable({
  users,
  loading,
  meta,
  page,
  onPageChange,
  showPhoneColumn,
  showPrimaryInfoColumn,
  showTypeColumn,
  showEmailColumns,
  showListingsColumn,
  showPartnerColumns,
  phoneColumnLabel,
  primaryInfoColumnLabel,
  openActionsUserId,
  onUserActionsClick,
  t,
}: UsersTabTableProps) {
  const actionsAriaLabel = t('admin.usersTab.colActions');

  return (
    <AdminTableState
      loading={loading && users.length === 0}
      isEmpty={users.length === 0}
      loadingText={t('common.loading')}
      emptyText={t('admin.usersTab.noUsers')}
    >
      <>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse [&_tbody_tr:nth-child(even)]:bg-primary-500/5">
            <thead>
              <tr className="border-b border-primary-700/30">
                {showPhoneColumn ? (
                  <th className={`${adminTableHeaderClassName} text-center`}>{phoneColumnLabel}</th>
                ) : null}
                {showPrimaryInfoColumn ? (
                  <th className={`${adminTableHeaderClassName} text-center`}>
                    {primaryInfoColumnLabel}
                  </th>
                ) : null}
                {showTypeColumn ? (
                  <th className={`${adminTableHeaderClassName} text-center`}>
                    {t('admin.usersTab.colType')}
                  </th>
                ) : null}
                {showEmailColumns ? (
                  <th className={`${adminTableHeaderClassName} text-center`}>
                    {t('admin.usersTab.colEmail')}
                  </th>
                ) : null}
                {showEmailColumns ? (
                  <th className={`${adminTableHeaderClassName} text-center`}>
                    {t('admin.usersTab.emailVerified')}
                  </th>
                ) : null}
                {showListingsColumn ? (
                  <th className={`${adminTableHeaderClassName} text-center`}>
                    {t('admin.usersTab.colListings')}
                  </th>
                ) : null}
                {showPartnerColumns ? (
                  <th className={`${adminTableHeaderClassName} text-center`}>
                    {t('admin.usersTab.colPartner')}
                  </th>
                ) : null}
                {showPartnerColumns ? (
                  <th className={`${adminTableHeaderClassName} text-center`}>
                    {t('admin.usersTab.colPartnerBalance')}
                  </th>
                ) : null}
                {showPartnerColumns ? (
                  <th className={`${adminTableHeaderClassName} text-center`}>
                    {t('admin.usersTab.colPartnerProgress')}
                  </th>
                ) : null}
                <th className={`${adminTableHeaderClassName} text-center`}>
                  {t('admin.usersTab.colLastLogin')}
                </th>
                <th className={`${adminTableHeaderClassName} text-center`}>
                  {t('admin.usersTab.colStatus')}
                </th>
                <th className={`${adminTableHeaderClassName} text-center`}>
                  {t('admin.usersTab.colId')}
                </th>
                <th className={`${adminTableHeaderClassName} text-center`}>
                  {t('admin.usersTab.colActions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UsersTableRow
                  key={user.id}
                  user={user}
                  showPhoneColumn={showPhoneColumn}
                  showPrimaryInfoColumn={showPrimaryInfoColumn}
                  showTypeColumn={showTypeColumn}
                  showEmailColumns={showEmailColumns}
                  showListingsColumn={showListingsColumn}
                  showPartnerColumns={showPartnerColumns}
                  phoneColumnLabel={phoneColumnLabel}
                  openActionsUserId={openActionsUserId}
                  onActionsButtonClick={onUserActionsClick}
                  actionsAriaLabel={actionsAriaLabel}
                  t={t}
                />
              ))}
            </tbody>
          </table>
        </div>

        {(meta?.totalPages ?? 0) > 1 ? (
          <Pagination
            currentPage={page}
            totalPages={meta?.totalPages ?? 1}
            onPageChange={onPageChange}
          />
        ) : null}
      </>
    </AdminTableState>
  );
}
