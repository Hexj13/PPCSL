import type { MouseEvent } from 'react';

import {
  getPartnerBalance,
  getPartnerListingsUntilNext,
  getTypeLabelKey,
} from '@/app/[locale]/admin/components/adminUsersHelpers';
import { CopyButton } from '@/components/common/CopyButton';
import type { User } from '@/lib/api';

import { AdminActionButton } from './AdminButtons';
import {
  AdminCopyValueCell,
  AdminDateTimeCell,
  adminTableCenteredCellClassName,
  adminTableCenteredSecondaryCellClassName,
  adminTablePrimaryButtonClassName,
} from './AdminTableShared';
import {
  buildUsersTableRowCounts,
  buildUsersTableRowDisplayName,
  buildUsersTableRowPhones,
  isUsersTablePartnerEnabled,
  USERS_TABLE_UNAVAILABLE,
} from './usersTableRowViewModel';

type UsersTableTranslate = (key: string, values?: Record<string, string | number>) => string;

export type UsersTableRowProps = {
  user: User;
  showPhoneColumn: boolean;
  showPrimaryInfoColumn: boolean;
  showTypeColumn: boolean;
  showEmailColumns: boolean;
  showListingsColumn: boolean;
  showPartnerColumns: boolean;
  phoneColumnLabel: string;
  openActionsUserId: string | null;
  onActionsButtonClick: (user: User, event: MouseEvent<HTMLButtonElement>) => void;
  actionsAriaLabel: string;
  t: UsersTableTranslate;
};

export function UsersTableRow({
  user,
  showPhoneColumn,
  showPrimaryInfoColumn,
  showTypeColumn,
  showEmailColumns,
  showListingsColumn,
  showPartnerColumns,
  phoneColumnLabel,
  openActionsUserId,
  onActionsButtonClick,
  actionsAriaLabel,
  t,
}: UsersTableRowProps) {
  const { listingCountTotal, listingCountActive } = buildUsersTableRowCounts(user);
  const { displayPrimaryPhone, displayAdditionalPhone } = buildUsersTableRowPhones(user);
  const displayName = buildUsersTableRowDisplayName(user);
  const partnerEnabled = isUsersTablePartnerEnabled(user);
  const emailTrimmed = user.email?.trim();

  return (
    <tr className="border-b border-primary-700/10">
      {showPhoneColumn ? (
        <td className={adminTableCenteredSecondaryCellClassName}>
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center justify-center gap-2">
              <span>{displayPrimaryPhone}</span>
              {displayPrimaryPhone !== USERS_TABLE_UNAVAILABLE ? (
                <CopyButton text={displayPrimaryPhone} label={phoneColumnLabel} />
              ) : null}
            </div>
            {displayAdditionalPhone ? (
              <div className="flex items-center justify-center gap-2">
                <span>{displayAdditionalPhone}</span>
                <CopyButton text={displayAdditionalPhone} label={phoneColumnLabel} />
              </div>
            ) : null}
          </div>
        </td>
      ) : null}
      {showPrimaryInfoColumn ? (
        <td className={adminTableCenteredCellClassName}>
          <span className="text-primary-900 font-medium">{displayName}</span>
        </td>
      ) : null}
      {showTypeColumn ? (
        <td className={adminTableCenteredSecondaryCellClassName}>
          {t(getTypeLabelKey(user.type))}
        </td>
      ) : null}
      {showEmailColumns ? (
        <td className={adminTableCenteredSecondaryCellClassName}>
          {emailTrimmed || USERS_TABLE_UNAVAILABLE}
        </td>
      ) : null}
      {showEmailColumns ? (
        <td className={adminTableCenteredSecondaryCellClassName}>
          {emailTrimmed ? (user.emailVerified === true ? t('common.yes') : t('common.no')) : '—'}
        </td>
      ) : null}
      {showListingsColumn ? (
        <td className={adminTableCenteredSecondaryCellClassName}>
          {listingCountTotal}/
          <span
            className={
              listingCountActive > 0
                ? 'text-semantic-success font-semibold'
                : 'text-semantic-error font-semibold'
            }
          >
            {listingCountActive}
          </span>
        </td>
      ) : null}
      {showPartnerColumns ? (
        <td className={adminTableCenteredSecondaryCellClassName}>
          {user.isPlatformPartner ? t('common.yes') : t('common.no')}
        </td>
      ) : null}
      {showPartnerColumns ? (
        <td className={adminTableCenteredSecondaryCellClassName}>
          {partnerEnabled ? getPartnerBalance(user) : '—'}
        </td>
      ) : null}
      {showPartnerColumns ? (
        <td className={adminTableCenteredSecondaryCellClassName}>
          {partnerEnabled
            ? t('admin.usersTab.partnerProgressValue', {
                count: getPartnerListingsUntilNext(user),
              })
            : '—'}
        </td>
      ) : null}
      <AdminDateTimeCell value={user.last_login_at} />
      <td
        className={`${adminTableCenteredCellClassName} font-semibold ${
          user.active !== false ? 'text-primary-500' : 'text-red-500'
        }`}
      >
        {user.active !== false ? t('admin.usersTab.active') : t('admin.usersTab.inactive')}
      </td>
      <td className={adminTableCenteredCellClassName}>
        <AdminCopyValueCell value={user.id} label="ID" short />
      </td>
      <td className={`${adminTableCenteredCellClassName} whitespace-nowrap`}>
        <div className="relative flex items-center justify-center">
          <AdminActionButton
            variant="secondary"
            data-admin-actions-trigger
            aria-haspopup="menu"
            aria-expanded={openActionsUserId === user.id}
            aria-label={actionsAriaLabel}
            className={adminTablePrimaryButtonClassName}
            onClick={(event) => onActionsButtonClick(user, event)}
          >
            {actionsAriaLabel}
          </AdminActionButton>
        </div>
      </td>
    </tr>
  );
}
